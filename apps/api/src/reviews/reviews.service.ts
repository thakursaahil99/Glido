import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createForOrder(userId: string, orderId: string, rating: number, comment?: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status !== "DELIVERED") {
      throw new BadRequestException("You can only review orders after they are delivered.");
    }
    const existing = await this.prisma.review.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestException("You have already reviewed this order.");

    const review = await this.prisma.review.create({
      data: { userId, restaurantId: order.restaurantId, orderId, rating, comment },
    });

    const agg = await this.prisma.review.aggregate({
      where: { restaurantId: order.restaurantId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.restaurant.update({
      where: { id: order.restaurantId },
      data: { ratingAvg: agg._avg.rating ?? rating, ratingCount: agg._count },
    });

    return review;
  }

  listForRestaurant(restaurantId: string, page = 1, pageSize = 20) {
    return Promise.all([
      this.prisma.review.findMany({
        where: { restaurantId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.review.count({ where: { restaurantId } }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }
}
