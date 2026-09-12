import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AuditLogService } from "../audit/audit-log.service";
import { CouponsService } from "../coupons/coupons.service";
import { DeliveryPartnersService } from "../delivery/delivery-partners.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { SettingsService } from "../settings/settings.service";
import { WalletService } from "../wallet/wallet.service";
import { OrdersService } from "./orders.service";

function baseOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order-1",
    orderNumber: "GL123",
    userId: "user-1",
    restaurantId: "rest-1",
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "COD",
    totalAmount: 250,
    deliveryPartnerId: null,
    ...overrides,
  };
}

describe("OrdersService — order status state machine", () => {
  let service: OrdersService;
  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
    payment: { update: jest.Mock };
    restaurant: { findUnique: jest.Mock };
    user: { update: jest.Mock };
  };
  let wallet: { credit: jest.Mock; debit: jest.Mock };
  let deliveryPartners: { tryAssign: jest.Mock; release: jest.Mock };
  let realtime: { emitNewOrder: jest.Mock; emitOrderUpdate: jest.Mock };
  let notifications: { notify: jest.Mock };
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      payment: { update: jest.fn() },
      restaurant: { findUnique: jest.fn().mockResolvedValue({ lat: 1, lng: 1 }) },
      user: { update: jest.fn() },
    };
    wallet = { credit: jest.fn(), debit: jest.fn() };
    deliveryPartners = { tryAssign: jest.fn().mockResolvedValue(null), release: jest.fn() };
    realtime = { emitNewOrder: jest.fn(), emitOrderUpdate: jest.fn() };
    notifications = { notify: jest.fn() };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: CouponsService, useValue: {} },
        { provide: PaymentsService, useValue: {} },
        { provide: RealtimeGateway, useValue: realtime },
        { provide: AuditLogService, useValue: auditLog },
        { provide: NotificationsService, useValue: notifications },
        { provide: WalletService, useValue: wallet },
        { provide: SettingsService, useValue: {} },
        { provide: DeliveryPartnersService, useValue: deliveryPartners },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it("allows a valid transition (PENDING -> ACCEPTED)", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "PENDING" }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "ACCEPTED" }));

    const result = await service.adminUpdateStatus("order-1", "ACCEPTED");

    expect(result.status).toBe("ACCEPTED");
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "ACCEPTED", statusHistory: { create: { status: "ACCEPTED", note: undefined } } },
    });
    expect(realtime.emitOrderUpdate).toHaveBeenCalled();
  });

  it("rejects a transition that skips states (PENDING -> DELIVERED)", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "PENDING" }));

    await expect(service.adminUpdateStatus("order-1", "DELIVERED")).rejects.toThrow(BadRequestException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("rejects any transition out of a terminal state (DELIVERED -> DELIVERED)", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "DELIVERED" }));

    await expect(service.adminUpdateStatus("order-1", "DELIVERED")).rejects.toThrow(
      "Cannot move order from DELIVERED to DELIVERED.",
    );
  });

  it("refunds a WALLET payment to the wallet and marks paymentStatus REFUNDED on cancellation", async () => {
    prisma.order.findUnique.mockResolvedValue(
      baseOrder({ status: "ACCEPTED", paymentStatus: "PAID", paymentMethod: "WALLET", totalAmount: 300 }),
    );
    // The DB update result deliberately still says PAID — this is the staleness case:
    // `updated` is captured before the refund branch flips the DB row, so the service
    // must patch the in-memory object explicitly rather than trusting this return value.
    prisma.order.update.mockResolvedValue(baseOrder({ status: "CANCELLED", paymentStatus: "PAID" }));

    const result = await service.adminUpdateStatus("order-1", "CANCELLED");

    expect(wallet.credit).toHaveBeenCalledWith("user-1", 300, "Refund for cancelled order", "order-1");
    expect(prisma.payment.update).toHaveBeenCalledWith({ where: { orderId: "order-1" }, data: { status: "REFUNDED" } });
    expect(result.paymentStatus).toBe("REFUNDED");
  });

  it("does not refund to wallet for a COD order that was never paid", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "PENDING", paymentStatus: "PENDING", paymentMethod: "COD" }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "CANCELLED" }));

    await service.adminUpdateStatus("order-1", "CANCELLED");

    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it("tries to assign a delivery partner when an order becomes READY", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "PREPARING" }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "READY" }));
    deliveryPartners.tryAssign.mockResolvedValue({ id: "partner-1" });

    const result = await service.adminUpdateStatus("order-1", "READY");

    expect(deliveryPartners.tryAssign).toHaveBeenCalledWith(1, 1);
    expect(result.deliveryPartnerId).toBe("partner-1");
  });

  it("releases the delivery partner once an order is delivered", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "OUT_FOR_DELIVERY", deliveryPartnerId: "partner-1" }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "DELIVERED" }));

    await service.adminUpdateStatus("order-1", "DELIVERED");

    expect(deliveryPartners.release).toHaveBeenCalledWith("partner-1");
  });

  it("awards 1 loyalty point per ₹10 spent when an order is delivered", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "OUT_FOR_DELIVERY", totalAmount: 254 }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "DELIVERED" }));

    await service.adminUpdateStatus("order-1", "DELIVERED");

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { loyaltyPoints: { increment: 25 } } });
  });

  it("awards no loyalty points for an order under ₹10", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "OUT_FOR_DELIVERY", totalAmount: 5 }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "DELIVERED" }));

    await service.adminUpdateStatus("order-1", "DELIVERED");

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("records an audit-log entry only when an actor performed the change", async () => {
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "PENDING" }));
    prisma.order.update.mockResolvedValue(baseOrder({ status: "ACCEPTED" }));

    await service.adminUpdateStatus("order-1", "ACCEPTED", "note", "admin-1");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ adminUserId: "admin-1", action: "ORDER_STATUS_CHANGED" }),
    );

    auditLog.record.mockClear();
    prisma.order.findUnique.mockResolvedValue(baseOrder({ status: "PENDING" }));
    await service.adminUpdateStatus("order-1", "ACCEPTED");
    expect(auditLog.record).not.toHaveBeenCalled();
  });
});
