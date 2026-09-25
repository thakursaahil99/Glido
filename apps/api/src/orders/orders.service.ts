import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { OrderStatus } from "@glido/shared";
import { AuditLogService } from "../audit/audit-log.service";
import { CouponsService } from "../coupons/coupons.service";
import { DeliveryPartnersService } from "../delivery/delivery-partners.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { SettingsService } from "../settings/settings.service";
import { WalletService } from "../wallet/wallet.service";
import { CreateOrderDto } from "./dto/orders.dto";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "placed",
  ACCEPTED: "accepted by the restaurant",
  PREPARING: "being prepared",
  READY: "ready for pickup",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

// 1 loyalty point per ₹10 spent, awarded when an order is delivered — redeemable via
// POST /users/me/loyalty/redeem (1 point = ₹1 credited to the wallet).
const LOYALTY_RUPEES_PER_POINT = 10;

function genOrderNumber() {
  return `GL${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
    private payments: PaymentsService,
    private realtime: RealtimeGateway,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private wallet: WalletService,
    private settings: SettingsService,
    private deliveryPartners: DeliveryPartnersService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const orderingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!orderingUser?.phone) {
      throw new BadRequestException("Please add a phone number to your profile before placing an order.");
    }

    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } });
    if (!restaurant || restaurant.status !== "APPROVED") {
      throw new NotFoundException("Restaurant not found.");
    }
    if (!restaurant.isOpen) {
      throw new BadRequestException("This restaurant is currently closed.");
    }

    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } });
    if (!address) throw new BadRequestException("Delivery address not found.");

    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: dto.restaurantId },
      include: { addons: true },
    });
    if (menuItems.length !== new Set(menuItemIds).size) {
      throw new BadRequestException("One or more items are unavailable at this restaurant.");
    }

    let subtotal = 0;
    const orderItemsData = dto.items.map((input) => {
      const menuItem = menuItems.find((m) => m.id === input.menuItemId)!;
      if (!menuItem.isAvailable) {
        throw new BadRequestException(`${menuItem.name} is currently unavailable.`);
      }
      const chosenAddons = (input.addonNames ?? [])
        .map((name) => menuItem.addons.find((a) => a.name === name))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      const addonsTotal = chosenAddons.reduce((sum, a) => sum + a.price, 0);
      const lineSubtotal = (menuItem.price + addonsTotal) * input.quantity;
      subtotal += lineSubtotal;

      return {
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price,
        quantity: input.quantity,
        addonsJson: chosenAddons.length ? JSON.stringify(chosenAddons.map((a) => ({ name: a.name, price: a.price }))) : null,
        subtotal: lineSubtotal,
      };
    });

    if (subtotal < restaurant.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount for this restaurant is ₹${restaurant.minOrderAmount}.`);
    }

    let discountAmount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const result = await this.coupons.computeDiscount({
        code: dto.couponCode,
        userId,
        restaurantId: dto.restaurantId,
        subtotal,
      });
      discountAmount = result.discount;
      couponId = result.coupon.id;
    }

    const taxRate = await this.settings.getTaxRate();
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const tipAmount = Math.max(0, Math.round((dto.tipAmount ?? 0) * 100) / 100);
    const totalAmount =
      Math.round(
        (subtotal + restaurant.deliveryFee + restaurant.packagingFee + taxAmount + tipAmount - discountAmount) * 100,
      ) / 100;

    if (dto.paymentMethod === "WALLET") {
      await this.wallet.debit(userId, totalAmount, "Food order payment");
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: genOrderNumber(),
        userId,
        restaurantId: dto.restaurantId,
        addressId: dto.addressId,
        subtotal,
        deliveryFee: restaurant.deliveryFee,
        packagingFee: restaurant.packagingFee,
        taxAmount,
        discountAmount,
        totalAmount,
        tipAmount,
        paymentMethod: dto.paymentMethod,
        couponId,
        deliveryInstructions: dto.deliveryInstructions,
        items: { create: orderItemsData },
        statusHistory: { create: { status: "PENDING", note: "Order placed." } },
      },
      include: { items: true },
    });

    if (couponId) await this.coupons.recordUsage(couponId);

    let paymentInfo: unknown = null;
    if (dto.paymentMethod === "ONLINE") {
      paymentInfo = await this.payments.createOrderForPayment(order.id, order.totalAmount);
    } else if (dto.paymentMethod === "WALLET") {
      await this.prisma.payment.create({
        data: { orderId: order.id, amount: order.totalAmount, method: "WALLET", status: "PAID" },
      });
      await this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
      order.paymentStatus = "PAID";
    } else {
      await this.prisma.payment.create({
        data: { orderId: order.id, amount: order.totalAmount, method: "COD", status: "PENDING" },
      });
    }

    this.realtime.emitNewOrder({ orderId: order.id, restaurantId: order.restaurantId, status: order.status });

    return { order, payment: paymentInfo };
  }

  async findMineList(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: { restaurant: true, items: true, payment: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOneForUser(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        restaurant: true,
        address: true,
        items: { include: { menuItem: { select: { imageUrl: true } } } },
        payment: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
        review: true,
        deliveryPartner: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  async cancel(userId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (!["PENDING", "ACCEPTED"].includes(order.status)) {
      throw new ForbiddenException("This order can no longer be cancelled.");
    }
    return this.applyStatusChange(orderId, "CANCELLED", reason ?? "Cancelled by customer.");
  }

  async reorderItems(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return { restaurantId: order.restaurantId, items: order.items };
  }

  // --- Admin ---
  async adminList(params: {
    status?: string;
    restaurantId?: string;
    paymentStatus?: string;
    page: number;
    pageSize: number;
  }) {
    const { status, restaurantId, paymentStatus, page, pageSize } = params;
    const where: any = {};
    if (status) where.status = status;
    if (restaurantId) where.restaurantId = restaurantId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { restaurant: true, user: true, payment: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Orders currently assigned to a delivery partner — used by /delivery-partner/me/orders.
   *  Includes orders assigned ahead of READY (e.g. an admin assigning a partner while the
   *  order is still PENDING/ACCEPTED/PREPARING) so the partner sees and can respond to the
   *  assignment immediately, not only once the order happens to reach READY. */
  async findAssignedToPartner(deliveryPartnerId: string) {
    return this.prisma.order.findMany({
      where: { deliveryPartnerId, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } },
      include: { restaurant: true, address: true, items: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async adminDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        user: true,
        address: true,
        items: { include: { menuItem: { select: { imageUrl: true } } } },
        payment: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
        deliveryPartner: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  /** Full record for invoice generation — same shape as adminDetail, kept separate
   *  so callers that only need PDF data don't have to import admin-only types. */
  async getForInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, user: true, address: true, items: true },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  async adminUpdateStatus(orderId: string, status: OrderStatus, note?: string, actorId?: string) {
    return this.applyStatusChange(orderId, status, note, actorId);
  }

  /** Manual override for when auto-assign (on READY) found nobody online, or an admin
   *  wants to swap the partner — releases whoever was previously assigned so they don't
   *  stay stuck "unavailable" for an order they're no longer on. */
  async assignDeliveryPartner(orderId: string, partnerId: string, actorId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
      throw new BadRequestException("Cannot assign a delivery partner to a completed or cancelled order.");
    }

    const partner = await this.deliveryPartners.getForManualAssign(partnerId);

    if (order.deliveryPartnerId && order.deliveryPartnerId !== partnerId) {
      await this.deliveryPartners.release(order.deliveryPartnerId);
    }
    await this.deliveryPartners.markUnavailable(partnerId);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryPartnerId: partnerId, deliveryAcceptanceStatus: "PENDING" },
    });

    if (actorId) {
      await this.auditLog.record({
        adminUserId: actorId,
        action: "ORDER_PARTNER_ASSIGNED",
        entity: "Order",
        entityId: orderId,
        before: { deliveryPartnerId: order.deliveryPartnerId },
        after: { deliveryPartnerId: partnerId },
      });
    }

    this.realtime.emitOrderUpdate(orderId, { orderId, status: updated.status, deliveryPartnerId: partnerId });
    return { message: `Order assigned to ${partner.name} — waiting for them to accept.` };
  }

  /** Called by the delivery partner from their app to accept or reject a pending
   *  assignment. Rejecting releases the partner and clears the assignment so the
   *  order goes back to being unassigned — admin sees it and can pick someone else,
   *  and auto-assign will also pick it up next time this order hits READY again. */
  async respondToDeliveryAssignment(orderId: string, partnerId: string, accept: boolean) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.deliveryPartnerId !== partnerId) {
      throw new ForbiddenException("This order isn't assigned to you.");
    }
    if (order.deliveryAcceptanceStatus !== "PENDING") {
      throw new BadRequestException("This assignment is no longer waiting for a response.");
    }

    if (accept) {
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { deliveryAcceptanceStatus: "ACCEPTED" },
      });
      this.realtime.emitOrderUpdate(orderId, { orderId, status: updated.status, deliveryPartnerId: partnerId });
      return { message: "Delivery accepted." };
    }

    await this.deliveryPartners.release(partnerId);
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryPartnerId: null, deliveryAcceptanceStatus: "NONE" },
    });

    // Try to hand it straight to another available partner rather than leaving it stuck unassigned.
    if (order.status === "READY" || order.status === "OUT_FOR_DELIVERY") {
      const restaurant = await this.prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
      const nextPartner = await this.deliveryPartners.tryAssign(restaurant?.lat, restaurant?.lng, partnerId);
      if (nextPartner) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { deliveryPartnerId: nextPartner.id, deliveryAcceptanceStatus: "PENDING" },
        });
      }
    }

    this.realtime.emitOrderUpdate(orderId, { orderId, status: updated.status, deliveryPartnerId: null });
    return { message: "Delivery rejected." };
  }

  private async applyStatusChange(orderId: string, status: OrderStatus, note?: string, actorId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move order from ${order.status} to ${status}.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        statusHistory: { create: { status, note } },
      },
    });

    if (status === "CANCELLED" && order.paymentStatus === "PAID") {
      await this.prisma.payment.update({ where: { orderId }, data: { status: "REFUNDED" } });
      await this.prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
      updated.paymentStatus = "REFUNDED";
      if (order.paymentMethod === "WALLET") {
        await this.wallet.credit(order.userId, order.totalAmount, "Refund for cancelled order", orderId);
      }
    }

    // Only auto-assign if nobody is already on this order — an admin may already have
    // manually assigned a partner before the order reached READY, and re-running
    // tryAssign here would silently swap them out for whoever else is free.
    if (status === "READY" && !order.deliveryPartnerId) {
      const restaurant = await this.prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
      const partner = await this.deliveryPartners.tryAssign(restaurant?.lat, restaurant?.lng);
      if (partner) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { deliveryPartnerId: partner.id, deliveryAcceptanceStatus: "PENDING" },
        });
        updated.deliveryPartnerId = partner.id;
      }
    }

    if ((status === "DELIVERED" || status === "CANCELLED") && order.deliveryPartnerId) {
      await this.deliveryPartners.release(order.deliveryPartnerId);
    }

    if (status === "DELIVERED") {
      const points = Math.floor(order.totalAmount / LOYALTY_RUPEES_PER_POINT);
      if (points > 0) {
        await this.prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: points } } });
      }
    }

    if (actorId) {
      await this.auditLog.record({
        adminUserId: actorId,
        action: "ORDER_STATUS_CHANGED",
        entity: "Order",
        entityId: orderId,
        before: { status: order.status },
        after: { status: updated.status, note },
      });
    }

    this.realtime.emitOrderUpdate(orderId, {
      orderId,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    });

    this.notifications.notify(
      order.userId,
      `Order #${order.orderNumber}`,
      `Your order is ${STATUS_LABEL[status]}.`,
      "ORDER",
    );

    return updated;
  }
}
