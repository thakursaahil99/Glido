import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// All bucketing is done in UTC calendar days, matching dayKey's use of toISOString,
// so a day-bucket boundary always agrees with how an order's timestamp is keyed —
// mixing UTC keys with local-time boundaries silently drops orders near midnight.
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function utcMidnight(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function buildDayBuckets(from: Date, to: Date) {
  const days: string[] = [];
  const cursor = utcMidnight(from);
  const end = utcMidnight(to);
  while (cursor <= end) {
    days.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async overview(rangeDays: number) {
    const to = new Date();
    const from = utcMidnight(to);
    from.setUTCDate(from.getUTCDate() - (rangeDays - 1));

    const [foodOrders, groceryOrders, rides, newUsers, restaurants, groceryProducts] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, totalAmount: true, paymentMethod: true, paymentStatus: true, status: true, restaurantId: true },
      }),
      this.prisma.groceryOrder.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, totalAmount: true, paymentMethod: true, paymentStatus: true, status: true },
      }),
      this.prisma.ride.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, finalFare: true, estimatedFare: true, paymentMethod: true, paymentStatus: true, status: true },
      }),
      this.prisma.user.findMany({
        where: { role: "CUSTOMER", createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.restaurant.findMany({ select: { id: true, name: true } }),
      this.prisma.groceryProduct.findMany({ select: { id: true, name: true } }),
    ]);

    const days = buildDayBuckets(from, to);
    const revenueByDay = new Map(days.map((d) => [d, { food: 0, grocery: 0, rides: 0 }]));
    const ordersByDay = new Map(days.map((d) => [d, { food: 0, grocery: 0, rides: 0 }]));
    const usersByDay = new Map(days.map((d) => [d, 0]));

    const isRevenueCounted = (paymentStatus: string) => paymentStatus === "PAID";

    for (const o of foodOrders) {
      const key = dayKey(o.createdAt);
      if (!ordersByDay.has(key)) continue;
      ordersByDay.get(key)!.food += 1;
      if (isRevenueCounted(o.paymentStatus)) revenueByDay.get(key)!.food += o.totalAmount;
    }
    for (const o of groceryOrders) {
      const key = dayKey(o.createdAt);
      if (!ordersByDay.has(key)) continue;
      ordersByDay.get(key)!.grocery += 1;
      if (isRevenueCounted(o.paymentStatus)) revenueByDay.get(key)!.grocery += o.totalAmount;
    }
    for (const r of rides) {
      const key = dayKey(r.createdAt);
      if (!ordersByDay.has(key)) continue;
      ordersByDay.get(key)!.rides += 1;
      if (isRevenueCounted(r.paymentStatus)) revenueByDay.get(key)!.rides += r.finalFare ?? r.estimatedFare;
    }
    for (const u of newUsers) {
      const key = dayKey(u.createdAt);
      if (usersByDay.has(key)) usersByDay.set(key, (usersByDay.get(key) ?? 0) + 1);
    }

    const revenueSeries = days.map((date) => {
      const v = revenueByDay.get(date)!;
      return { date, food: round2(v.food), grocery: round2(v.grocery), rides: round2(v.rides), total: round2(v.food + v.grocery + v.rides) };
    });
    const ordersSeries = days.map((date) => {
      const v = ordersByDay.get(date)!;
      return { date, food: v.food, grocery: v.grocery, rides: v.rides, total: v.food + v.grocery + v.rides };
    });
    const newUsersSeries = days.map((date) => ({ date, count: usersByDay.get(date) ?? 0 }));

    const totalRevenue = revenueSeries.reduce((s, d) => s + d.total, 0);
    const totalOrders = ordersSeries.reduce((s, d) => s + d.total, 0);
    const totalNewUsers = newUsersSeries.reduce((s, d) => s + d.count, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const restaurantNameById = new Map(restaurants.map((r) => [r.id, r.name]));
    const restaurantAgg = new Map<string, { orders: number; revenue: number }>();
    for (const o of foodOrders) {
      if (!isRevenueCounted(o.paymentStatus)) continue;
      const entry = restaurantAgg.get(o.restaurantId) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += o.totalAmount;
      restaurantAgg.set(o.restaurantId, entry);
    }
    const topRestaurants = [...restaurantAgg.entries()]
      .map(([id, v]) => ({ id, name: restaurantNameById.get(id) ?? "Unknown", orders: v.orders, revenue: round2(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const groceryItems = await this.prisma.groceryOrderItem.findMany({
      where: { order: { createdAt: { gte: from }, paymentStatus: "PAID" } },
      select: { productId: true, quantity: true, subtotal: true },
    });
    const productNameById = new Map(groceryProducts.map((p) => [p.id, p.name]));
    const productAgg = new Map<string, { units: number; revenue: number }>();
    for (const item of groceryItems) {
      const entry = productAgg.get(item.productId) ?? { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.subtotal;
      productAgg.set(item.productId, entry);
    }
    const topGroceryProducts = [...productAgg.entries()]
      .map(([id, v]) => ({ id, name: productNameById.get(id) ?? "Unknown", unitsSold: v.units, revenue: round2(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentAgg = new Map<string, { count: number; amount: number }>();
    const addPayment = (method: string, paymentStatus: string, amount: number) => {
      if (!isRevenueCounted(paymentStatus)) return;
      const entry = paymentAgg.get(method) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += amount;
      paymentAgg.set(method, entry);
    };
    for (const o of foodOrders) addPayment(o.paymentMethod, o.paymentStatus, o.totalAmount);
    for (const o of groceryOrders) addPayment(o.paymentMethod, o.paymentStatus, o.totalAmount);
    for (const r of rides) addPayment(r.paymentMethod, r.paymentStatus, r.finalFare ?? r.estimatedFare);
    const paymentBreakdown = [...paymentAgg.entries()]
      .map(([method, v]) => ({ method, count: v.count, amount: round2(v.amount) }))
      .sort((a, b) => b.amount - a.amount);

    return {
      rangeDays,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        revenue: round2(totalRevenue),
        orders: totalOrders,
        newCustomers: totalNewUsers,
        avgOrderValue: round2(avgOrderValue),
      },
      revenueSeries,
      ordersSeries,
      newUsersSeries,
      topRestaurants,
      topGroceryProducts,
      paymentBreakdown,
    };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
