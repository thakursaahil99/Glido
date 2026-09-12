import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CouponsService } from "./coupons.service";

function baseCoupon(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "c1",
    code: "GLIDO50",
    type: "PERCENT",
    value: 50,
    maxDiscount: 100,
    minOrderAmount: 0,
    usageLimit: null,
    usedCount: 0,
    perUserLimit: 1,
    isActive: true,
    restaurantId: null,
    validFrom: new Date(Date.now() - 86_400_000),
    validTo: null,
    ...overrides,
  };
}

describe("CouponsService", () => {
  let service: CouponsService;
  let prisma: {
    coupon: { findUnique: jest.Mock; update: jest.Mock };
    order: { count: jest.Mock };
    groceryOrder: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      coupon: { findUnique: jest.fn(), update: jest.fn() },
      order: { count: jest.fn().mockResolvedValue(0) },
      groceryOrder: { count: jest.fn().mockResolvedValue(0) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(CouponsService);
  });

  it("rejects an unknown or inactive coupon", async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);
    await expect(service.computeDiscount({ code: "NOPE", userId: "u1", subtotal: 500 })).rejects.toThrow(BadRequestException);

    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ isActive: false }));
    await expect(service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 500 })).rejects.toThrow(BadRequestException);
  });

  it("rejects a restaurant-scoped coupon used at the wrong restaurant", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ restaurantId: "r1" }));
    await expect(
      service.computeDiscount({ code: "GLIDO50", userId: "u1", restaurantId: "r2", subtotal: 500 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a coupon that has not started yet or has expired", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ validFrom: new Date(Date.now() + 86_400_000) }));
    await expect(service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 500 })).rejects.toThrow(
      "not active yet",
    );

    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ validTo: new Date(Date.now() - 86_400_000) }));
    await expect(service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 500 })).rejects.toThrow("expired");
  });

  it("rejects an order below the coupon's minimum amount", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ minOrderAmount: 300 }));
    await expect(service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 200 })).rejects.toThrow(
      "Minimum order amount",
    );
  });

  it("rejects a coupon that has hit its global usage limit", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ usageLimit: 10, usedCount: 10 }));
    await expect(service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 500 })).rejects.toThrow(
      "usage limit",
    );
  });

  it("rejects a coupon the user has already used up to their per-user limit", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ perUserLimit: 1 }));
    prisma.order.count.mockResolvedValue(1);
    await expect(service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 500 })).rejects.toThrow(
      "maximum number of times",
    );
  });

  it("computes a PERCENT discount capped by maxDiscount", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ type: "PERCENT", value: 50, maxDiscount: 100 }));
    const result = await service.computeDiscount({ code: "GLIDO50", userId: "u1", subtotal: 500 });
    // 50% of 500 = 250, capped at maxDiscount 100
    expect(result.discount).toBe(100);
  });

  it("computes a FLAT discount and never exceeds the subtotal", async () => {
    prisma.coupon.findUnique.mockResolvedValue(baseCoupon({ type: "FLAT", value: 50, maxDiscount: null }));
    const small = await service.computeDiscount({ code: "FLAT50", userId: "u1", subtotal: 30 });
    expect(small.discount).toBe(30);

    const normal = await service.computeDiscount({ code: "FLAT50", userId: "u1", subtotal: 300 });
    expect(normal.discount).toBe(50);
  });
});
