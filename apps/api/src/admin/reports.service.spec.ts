import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "./reports.service";

/**
 * Regression coverage for a real bug found while building this feature: the day-bucket
 * boundaries were computed in local time while each record's bucket key came from
 * `createdAt.toISOString()` (UTC). On a non-UTC machine that mismatch silently dropped
 * orders placed near local midnight from `revenueSeries`/`ordersSeries` while
 * `paymentBreakdown`/`topRestaurants` (which iterate the raw records with no bucket
 * check) still counted them — so the three views of "how much did we make" disagreed.
 * Fixed by bucketing entirely in UTC (see `utcMidnight` in reports.service.ts).
 */
describe("ReportsService — day-bucketing correctness", () => {
  let service: ReportsService;
  let prisma: {
    order: { findMany: jest.Mock };
    groceryOrder: { findMany: jest.Mock };
    ride: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    restaurant: { findMany: jest.Mock };
    groceryProduct: { findMany: jest.Mock };
    groceryOrderItem: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
      groceryOrder: { findMany: jest.fn().mockResolvedValue([]) },
      ride: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      restaurant: { findMany: jest.fn().mockResolvedValue([]) },
      groceryProduct: { findMany: jest.fn().mockResolvedValue([]) },
      groceryOrderItem: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ReportsService);
  });

  it("puts an order exactly at the UTC day boundary into that UTC day's bucket", async () => {
    const todayUtcMidnight = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    prisma.order.findMany.mockResolvedValue([
      { createdAt: todayUtcMidnight, totalAmount: 111, paymentMethod: "COD", paymentStatus: "PAID", status: "DELIVERED", restaurantId: "r1" },
    ]);
    prisma.restaurant.findMany.mockResolvedValue([{ id: "r1", name: "Test Kitchen" }]);

    const result = await service.overview(1);

    expect(result.revenueSeries).toHaveLength(1);
    expect(result.revenueSeries[0].food).toBe(111);
    expect(result.revenueSeries[0].date).toBe(todayUtcMidnight.toISOString().slice(0, 10));
  });

  it("reconciles totals.revenue against revenueSeries and paymentBreakdown across mixed food/grocery/ride data", async () => {
    const now = new Date();
    prisma.order.findMany.mockResolvedValue([
      { createdAt: now, totalAmount: 300, paymentMethod: "ONLINE", paymentStatus: "PAID", status: "DELIVERED", restaurantId: "r1" },
      { createdAt: now, totalAmount: 200, paymentMethod: "COD", paymentStatus: "PENDING", status: "PENDING", restaurantId: "r1" }, // unpaid — excluded from revenue
    ]);
    prisma.groceryOrder.findMany.mockResolvedValue([
      { createdAt: now, totalAmount: 150, paymentMethod: "WALLET", paymentStatus: "PAID", status: "DELIVERED" },
    ]);
    prisma.ride.findMany.mockResolvedValue([
      { createdAt: now, finalFare: 90, estimatedFare: 80, paymentMethod: "ONLINE", paymentStatus: "PAID", status: "COMPLETED" },
    ]);
    prisma.restaurant.findMany.mockResolvedValue([{ id: "r1", name: "Test Kitchen" }]);

    const result = await service.overview(7);

    const revenueSeriesSum = result.revenueSeries.reduce((s, d) => s + d.total, 0);
    const paymentBreakdownSum = result.paymentBreakdown.reduce((s, p) => s + p.amount, 0);

    expect(result.totals.revenue).toBe(540); // 300 + 150 + 90 (finalFare, not estimatedFare) — PENDING order excluded
    expect(revenueSeriesSum).toBe(result.totals.revenue);
    expect(paymentBreakdownSum).toBe(result.totals.revenue);

    // orders/rides count includes the unpaid order (order counts aren't revenue-gated)
    expect(result.totals.orders).toBe(4);
  });
});
