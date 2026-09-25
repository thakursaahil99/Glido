import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { OrderStatus } from "@glido/shared";
import { AuditLogService } from "../audit/audit-log.service";
import { CouponsService } from "../coupons/coupons.service";
import { DeliveryPartnersService } from "../delivery/delivery-partners.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { SettingsService } from "../settings/settings.service";
import { WalletService } from "../wallet/wallet.service";
import { CreateGroceryOrderDto } from "./dto/grocery-orders.dto";

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
  ACCEPTED: "accepted",
  PREPARING: "being packed",
  READY: "ready for pickup",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

// Kept in sync with orders.service.ts's LOYALTY_RUPEES_PER_POINT — 1 point per ₹10 spent.
const LOYALTY_RUPEES_PER_POINT = 10;

function genOrderNumber() {
  return `GLG${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}

@Injectable()
export class GroceryOrdersService {
  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
    private realtime: RealtimeGateway,
    private auditLog: AuditLogService,
    private notifications: NotificationsService,
    private wallet: WalletService,
    private settings: SettingsService,
    private deliveryPartners: DeliveryPartnersService,
  ) {}

  async create(userId: string, dto: CreateGroceryOrderDto) {
    const orderingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!orderingUser?.phone) {
      throw new BadRequestException("Please add a phone number to your profile before placing an order.");
    }

    const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } });
    if (!address) throw new BadRequestException("Delivery address not found.");

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.groceryProduct.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException("One or more products are no longer available.");
    }

    let subtotal = 0;
    const orderItemsData = dto.items.map((input) => {
      const product = products.find((p) => p.id === input.productId)!;
      if (!product.isAvailable) {
        throw new BadRequestException(`${product.name} is currently unavailable.`);
      }
      if (product.stockQty < input.quantity) {
        throw new BadRequestException(`Only ${product.stockQty} × ${product.name} left in stock.`);
      }
      const lineSubtotal = product.price * input.quantity;
      subtotal += lineSubtotal;
      return {
        productId: product.id,
        nameSnapshot: product.name,
        priceSnapshot: product.price,
        quantity: input.quantity,
        subtotal: lineSubtotal,
      };
    });

    let discountAmount = 0;
    let couponId: string | undefined;
    if (dto.couponCode) {
      const result = await this.coupons.computeDiscount({
        code: dto.couponCode,
        userId,
        subtotal,
      });
      discountAmount = result.discount;
      couponId = result.coupon.id;
    }

    const settings = await this.settings.getAll();
    const deliveryFee = subtotal >= settings.groceryFreeDeliveryThreshold ? 0 : settings.groceryDeliveryFee;
    const taxAmount = Math.round(subtotal * (settings.taxRatePercent / 100) * 100) / 100;
    const tipAmount = Math.max(0, Math.round((dto.tipAmount ?? 0) * 100) / 100);
    const totalAmount = Math.round((subtotal + deliveryFee + taxAmount + tipAmount - discountAmount) * 100) / 100;
    const paymentMethod = dto.paymentMethod ?? "COD";

    if (paymentMethod === "WALLET") {
      await this.wallet.debit(userId, totalAmount, "Grocery order payment");
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.groceryOrder.create({
        data: {
          orderNumber: genOrderNumber(),
          userId,
          addressId: dto.addressId,
          subtotal,
          deliveryFee,
          taxAmount,
          discountAmount,
          totalAmount,
          tipAmount,
          paymentMethod,
          paymentStatus: paymentMethod === "WALLET" ? "PAID" : "PENDING",
          couponId,
          deliveryInstructions: dto.deliveryInstructions,
          items: { create: orderItemsData },
          statusHistory: { create: { status: "PENDING", note: "Order placed." } },
        },
        include: { items: true },
      });

      for (const item of orderItemsData) {
        await tx.groceryProduct.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        });
      }

      return created;
    });

    if (couponId) await this.coupons.recordUsage(couponId);

    this.realtime.emitNewOrder({ orderId: order.id, status: order.status, kind: "grocery" });

    return order;
  }

  async findMineList(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.groceryOrder.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.groceryOrder.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOneForUser(userId: string, orderId: string) {
    const order = await this.prisma.groceryOrder.findFirst({
      where: { id: orderId, userId },
      include: {
        address: true,
        items: { include: { product: { select: { imageUrl: true } } } },
        statusHistory: { orderBy: { changedAt: "asc" } },
        deliveryPartner: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  async cancel(userId: string, orderId: string, reason?: string) {
    const order = await this.prisma.groceryOrder.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (!["PENDING", "ACCEPTED"].includes(order.status)) {
      throw new ForbiddenException("This order can no longer be cancelled.");
    }
    await this.restockItems(orderId);
    return this.applyStatusChange(orderId, "CANCELLED", reason ?? "Cancelled by customer.");
  }

  // --- Admin ---
  async adminList(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: any = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.groceryOrder.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.groceryOrder.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Orders currently assigned to a delivery partner — used by /delivery-partner/me/orders. */
  async findAssignedToPartner(deliveryPartnerId: string) {
    return this.prisma.groceryOrder.findMany({
      where: { deliveryPartnerId, status: { in: ["READY", "OUT_FOR_DELIVERY"] } },
      include: { address: true, items: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async adminDetail(orderId: string) {
    const order = await this.prisma.groceryOrder.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        address: true,
        items: { include: { product: { select: { imageUrl: true } } } },
        statusHistory: { orderBy: { changedAt: "asc" } },
        deliveryPartner: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  /** Full record for invoice generation. */
  async getForInvoice(orderId: string) {
    const order = await this.prisma.groceryOrder.findUnique({
      where: { id: orderId },
      include: { user: true, address: true, items: true },
    });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  async adminUpdateStatus(orderId: string, status: OrderStatus, note?: string, actorId?: string) {
    if (status === "CANCELLED") await this.restockItems(orderId);
    return this.applyStatusChange(orderId, status, note, actorId);
  }

  /** Manual override for when auto-assign (on READY) found nobody online, or an admin
   *  wants to swap the partner — releases whoever was previously assigned so they don't
   *  stay stuck "unavailable" for an order they're no longer on. */
  async assignDeliveryPartner(orderId: string, partnerId: string, actorId?: string) {
    const order = await this.prisma.groceryOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
      throw new BadRequestException("Cannot assign a delivery partner to a completed or cancelled order.");
    }

    const partner = await this.deliveryPartners.getForManualAssign(partnerId);

    if (order.deliveryPartnerId && order.deliveryPartnerId !== partnerId) {
      await this.deliveryPartners.release(order.deliveryPartnerId);
    }

    const updated = await this.prisma.groceryOrder.update({
      where: { id: orderId },
      data: { deliveryPartnerId: partnerId, deliveryAcceptanceStatus: "PENDING" },
    });

    if (actorId) {
      await this.auditLog.record({
        adminUserId: actorId,
        action: "GROCERY_ORDER_PARTNER_ASSIGNED",
        entity: "GroceryOrder",
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
   *  order goes back to being unassigned. */
  async respondToDeliveryAssignment(orderId: string, partnerId: string, accept: boolean) {
    const order = await this.prisma.groceryOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.deliveryPartnerId !== partnerId) {
      throw new ForbiddenException("This order isn't assigned to you.");
    }
    if (order.deliveryAcceptanceStatus !== "PENDING") {
      throw new BadRequestException("This assignment is no longer waiting for a response.");
    }

    if (accept) {
      const updated = await this.prisma.groceryOrder.update({
        where: { id: orderId },
        data: { deliveryAcceptanceStatus: "ACCEPTED" },
      });
      this.realtime.emitOrderUpdate(orderId, { orderId, status: updated.status, deliveryPartnerId: partnerId });
      return { message: "Delivery accepted." };
    }

    await this.deliveryPartners.release(partnerId);
    const updated = await this.prisma.groceryOrder.update({
      where: { id: orderId },
      data: { deliveryPartnerId: null, deliveryAcceptanceStatus: "NONE" },
    });

    if (order.status === "READY" || order.status === "OUT_FOR_DELIVERY") {
      const nextPartner = await this.deliveryPartners.tryAssign(null, null);
      if (nextPartner) {
        await this.prisma.groceryOrder.update({
          where: { id: orderId },
          data: { deliveryPartnerId: nextPartner.id, deliveryAcceptanceStatus: "PENDING" },
        });
      }
    }

    this.realtime.emitOrderUpdate(orderId, { orderId, status: updated.status, deliveryPartnerId: null });
    return { message: "Delivery rejected." };
  }

  private async restockItems(orderId: string) {
    const items = await this.prisma.groceryOrderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await this.prisma.groceryProduct.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.quantity } },
      });
    }
  }

  private async applyStatusChange(orderId: string, status: OrderStatus, note?: string, actorId?: string) {
    const order = await this.prisma.groceryOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move order from ${order.status} to ${status}.`);
    }

    const updated = await this.prisma.groceryOrder.update({
      where: { id: orderId },
      data: { status, statusHistory: { create: { status, note } } },
    });

    if (status === "CANCELLED" && order.paymentStatus === "PAID" && order.paymentMethod === "WALLET") {
      await this.prisma.groceryOrder.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
      updated.paymentStatus = "REFUNDED";
      await this.wallet.credit(order.userId, order.totalAmount, "Refund for cancelled grocery order", orderId);
    }

    if (status === "READY") {
      const partner = await this.deliveryPartners.tryAssign(null, null);
      if (partner) {
        await this.prisma.groceryOrder.update({
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
        action: "GROCERY_ORDER_STATUS_CHANGED",
        entity: "GroceryOrder",
        entityId: orderId,
        before: { status: order.status },
        after: { status: updated.status, note },
      });
    }

    this.realtime.emitOrderUpdate(orderId, { orderId, status: updated.status, kind: "grocery" });

    this.notifications.notify(
      order.userId,
      `Grocery order #${order.orderNumber}`,
      `Your grocery order is ${STATUS_LABEL[status]}.`,
      "ORDER",
    );

    return updated;
  }
}
