import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalRestaurants,
      pendingRestaurants,
      totalOrders,
      ordersToday,
      ordersByStatus,
      revenueAgg,
      recentOrders,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: "CUSTOMER" } }),
      this.prisma.restaurant.count(),
      this.prisma.restaurant.count({ where: { status: "PENDING" } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.groupBy({ by: ["status"], _count: true }),
      this.prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { restaurant: { select: { name: true } }, user: { select: { name: true, phone: true, email: true } } },
      }),
    ]);

    return {
      totalUsers,
      totalRestaurants,
      pendingRestaurants,
      totalOrders,
      ordersToday,
      revenue: revenueAgg._sum.totalAmount ?? 0,
      ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
      recentOrders,
    };
  }
}
