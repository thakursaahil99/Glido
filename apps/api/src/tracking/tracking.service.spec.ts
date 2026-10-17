import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { GeocodeService } from "../geocode/geocode.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { TrackingService } from "./tracking.service";
import { estimateDelivery } from "./tracking.util";

const RESTAURANT = { lat: 18.9322, lng: 72.8264 };
const HOME = { lat: 18.954, lng: 72.8148 };

function trackedOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order-1",
    orderNumber: "GL123",
    status: "OUT_FOR_DELIVERY",
    userId: "customer-1",
    deliveryAcceptanceStatus: "ACCEPTED",
    updatedAt: new Date(),
    restaurant: { id: "rest-1", name: "Spice Route", addressLine: null, ownerUserId: "owner-1", city: null, ...RESTAURANT },
    address: { id: "addr-1", label: "Home", line1: "12 Marine Drive", line2: null, pincode: "400002", city: null, ...HOME },
    deliveryPartner: {
      id: "dp-1",
      userId: "rider-1",
      name: "Rakesh",
      phone: "+91",
      photoUrl: null,
      vehicleType: "Bike",
      vehicleNumber: null,
      ratingAvg: 4.8,
      currentLat: 18.94,
      currentLng: 72.82,
      heading: 90,
      lastLocationAt: new Date(),
    },
    ...overrides,
  };
}

const customer: AuthUser = { id: "customer-1", role: "CUSTOMER" };

describe("TrackingService", () => {
  let service: TrackingService;
  let prisma: {
    deliveryPartner: { findUnique: jest.Mock; update: jest.Mock };
    order: { findMany: jest.Mock; findUnique: jest.Mock };
    restaurant: { update: jest.Mock };
    address: { update: jest.Mock };
  };
  let realtime: { emitRiderLocation: jest.Mock; onRiderLocation: jest.Mock };
  let geocode: { firstMatch: jest.Mock };

  beforeEach(async () => {
    prisma = {
      deliveryPartner: { findUnique: jest.fn(), update: jest.fn() },
      order: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      restaurant: { update: jest.fn().mockResolvedValue({}) },
      address: { update: jest.fn().mockResolvedValue({}) },
    };
    realtime = { emitRiderLocation: jest.fn(), onRiderLocation: jest.fn() };
    geocode = { firstMatch: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RealtimeGateway, useValue: realtime },
        { provide: GeocodeService, useValue: geocode },
      ],
    }).compile();
    service = moduleRef.get(TrackingService);
  });

  describe("updateRiderLocation", () => {
    it("saves the fix and pushes it to every order the rider is carrying", async () => {
      prisma.deliveryPartner.findUnique.mockResolvedValue({ id: "dp-1" });
      prisma.order.findMany.mockResolvedValue([
        { id: "order-1", status: "OUT_FOR_DELIVERY", restaurant: RESTAURANT, address: HOME },
        { id: "order-2", status: "READY", restaurant: RESTAURANT, address: { lat: null, lng: null } },
      ]);

      const res = await service.updateRiderLocation("rider-1", { lat: 18.94, lng: 72.82, heading: 45 });

      expect(prisma.deliveryPartner.update).toHaveBeenCalledWith({
        where: { id: "dp-1" },
        data: expect.objectContaining({ currentLat: 18.94, currentLng: 72.82, heading: 45, lastLocationAt: expect.any(Date) }),
      });
      expect(res.activeOrders).toBe(2);
      expect(realtime.emitRiderLocation).toHaveBeenCalledTimes(2);
      const [orderId, event] = realtime.emitRiderLocation.mock.calls[0];
      expect(orderId).toBe("order-1");
      expect(event).toMatchObject({ orderId: "order-1", lat: 18.94, lng: 72.82, heading: 45 });
      expect(event.etaMinutes).toBeGreaterThan(0);
      // No drop coordinates → no ETA, but the position is still pushed.
      expect(realtime.emitRiderLocation.mock.calls[1][1]).toMatchObject({ orderId: "order-2", etaMinutes: null });
    });

    it("only broadcasts to orders whose assignment the rider has accepted", async () => {
      prisma.deliveryPartner.findUnique.mockResolvedValue({ id: "dp-1" });
      await service.updateRiderLocation("rider-1", { lat: 1, lng: 1 });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deliveryAcceptanceStatus: { notIn: ["PENDING", "REJECTED"] } }),
        }),
      );
    });

    it("rejects accounts with no delivery partner profile", async () => {
      prisma.deliveryPartner.findUnique.mockResolvedValue(null);
      await expect(service.updateRiderLocation("someone", { lat: 1, lng: 1 })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.deliveryPartner.update).not.toHaveBeenCalled();
    });
  });

  describe("getOrderTracking", () => {
    it("returns pickup, drop, rider position and an ETA to the customer", async () => {
      prisma.order.findUnique.mockResolvedValue(trackedOrder());
      const t = await service.getOrderTracking("order-1", customer);
      expect(t.restaurant).toMatchObject(RESTAURANT);
      expect(t.drop).toMatchObject(HOME);
      expect(t.rider).toMatchObject({ name: "Rakesh", lat: 18.94, lng: 72.82, heading: 90 });
      expect(t.etaMinutes).toBeGreaterThan(0);
    });

    it("lets the restaurant owner, the assigned rider and order staff track it", async () => {
      prisma.order.findUnique.mockResolvedValue(trackedOrder());
      await expect(service.getOrderTracking("order-1", { id: "owner-1", role: "RESTAURANT_OWNER" })).resolves.toBeDefined();
      await expect(service.getOrderTracking("order-1", { id: "rider-1", role: "DELIVERY_PARTNER" })).resolves.toBeDefined();
      await expect(
        service.getOrderTracking("order-1", { id: "staff", role: "ADMIN", permissions: ["manage_orders"] }),
      ).resolves.toBeDefined();
    });

    it("hides the order from anyone else, including staff without order access", async () => {
      prisma.order.findUnique.mockResolvedValue(trackedOrder());
      await expect(service.getOrderTracking("order-1", { id: "stranger", role: "CUSTOMER" })).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getOrderTracking("order-1", { id: "other-owner", role: "RESTAURANT_OWNER" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.getOrderTracking("order-1", { id: "staff", role: "ADMIN", permissions: [] })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("doesn't reveal the rider until they've accepted, or after delivery", async () => {
      prisma.order.findUnique.mockResolvedValue(trackedOrder({ status: "READY", deliveryAcceptanceStatus: "PENDING" }));
      expect((await service.getOrderTracking("order-1", customer)).rider).toBeNull();

      prisma.order.findUnique.mockResolvedValue(trackedOrder({ status: "DELIVERED" }));
      const delivered = await service.getOrderTracking("order-1", customer);
      expect(delivered.rider).toBeNull();
      expect(delivered.etaMinutes).toBeNull();
    });

    it("geocodes a hand-typed address once and saves the result", async () => {
      prisma.order.findUnique.mockResolvedValue(
        trackedOrder({
          address: { id: "addr-1", label: "Home", line1: "12 Marine Drive", line2: null, pincode: "400002", city: { name: "Mumbai" }, lat: null, lng: null },
        }),
      );
      geocode.firstMatch.mockResolvedValue(HOME);

      const t = await service.getOrderTracking("order-1", customer);

      expect(geocode.firstMatch).toHaveBeenCalledWith("12 Marine Drive, Mumbai, 400002");
      expect(prisma.address.update).toHaveBeenCalledWith({ where: { id: "addr-1" }, data: HOME });
      expect(t.drop).toMatchObject(HOME);
    });

    it("falls back to the city centre for a restaurant with no pin, and stops retrying a failed lookup", async () => {
      const order = trackedOrder({
        restaurant: {
          id: "rest-1",
          name: "Pizza",
          addressLine: "Food Court",
          ownerUserId: null,
          lat: null,
          lng: null,
          city: { name: "Mumbai", centerLat: 18.96, centerLng: 72.82 },
        },
      });
      prisma.order.findUnique.mockResolvedValue(order);

      const t = await service.getOrderTracking("order-1", customer);
      expect(t.restaurant).toMatchObject({ lat: 18.96, lng: 72.82 });
      expect(prisma.restaurant.update).not.toHaveBeenCalled();

      geocode.firstMatch.mockClear();
      await service.getOrderTracking("order-1", customer);
      expect(geocode.firstMatch).not.toHaveBeenCalled();
    });
  });
});

describe("estimateDelivery", () => {
  it("counts only the last leg once the food is out for delivery", () => {
    const near = estimateDelivery({ status: "OUT_FOR_DELIVERY", restaurant: RESTAURANT, drop: HOME, rider: { lat: 18.953, lng: 72.815 } });
    const far = estimateDelivery({ status: "OUT_FOR_DELIVERY", restaurant: RESTAURANT, drop: HOME, rider: RESTAURANT });
    expect(near!.etaMinutes).toBeLessThan(far!.etaMinutes);
    expect(near!.etaMinutes).toBeGreaterThanOrEqual(1);
  });

  it("adds prep time before pickup and shrinks as the order progresses", () => {
    const accepted = estimateDelivery({ status: "ACCEPTED", restaurant: RESTAURANT, drop: HOME, rider: null });
    const ready = estimateDelivery({ status: "READY", restaurant: RESTAURANT, drop: HOME, rider: null });
    expect(accepted!.etaMinutes).toBeGreaterThan(ready!.etaMinutes);
  });

  it("gives no ETA when the rider's fix is implausibly far away (stale GPS from another city)", () => {
    const chandigarh = { lat: 30.7263, lng: 76.7676 };
    expect(estimateDelivery({ status: "OUT_FOR_DELIVERY", restaurant: RESTAURANT, drop: HOME, rider: chandigarh })).toBeNull();
    expect(estimateDelivery({ status: "READY", restaurant: RESTAURANT, drop: HOME, rider: chandigarh })).toBeNull();
  });

  it("has nothing to say without a drop point or once the order is finished", () => {
    expect(estimateDelivery({ status: "OUT_FOR_DELIVERY", restaurant: RESTAURANT, drop: null, rider: RESTAURANT })).toBeNull();
    expect(estimateDelivery({ status: "DELIVERED", restaurant: RESTAURANT, drop: HOME, rider: RESTAURANT })).toBeNull();
  });
});
