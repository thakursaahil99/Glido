import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertCouponDto } from "./dto/coupons.dto";

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(dto: UpsertCouponDto) {
    const { validTo, ...rest } = dto;
    return this.prisma.coupon.create({
      data: { ...rest, code: dto.code.toUpperCase(), validTo: validTo ? new Date(validTo) : undefined },
    });
  }

  async update(id: string, dto: Partial<UpsertCouponDto>) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon not found.");
    const { validTo, ...rest } = dto;
    return this.prisma.coupon.update({
      where: { id },
      data: { ...rest, validTo: validTo ? new Date(validTo) : undefined },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon not found.");
    await this.prisma.coupon.delete({ where: { id } });
    return { message: "Coupon deleted." };
  }

  /**
   * Validates a coupon for a given user/subtotal and returns the discount amount. Throws if
   * invalid. `restaurantId` is omitted for grocery orders — restaurant-specific coupons then
   * simply don't apply (only coupons with no restaurantId are valid for grocery).
   */
  async computeDiscount(params: {
    code: string;
    userId: string;
    restaurantId?: string;
    subtotal: number;
  }) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: params.code.toUpperCase() },
    });
    if (!coupon || !coupon.isActive) throw new BadRequestException("Invalid or inactive coupon.");
    if (coupon.restaurantId && coupon.restaurantId !== params.restaurantId) {
      throw new BadRequestException("This coupon is not valid here.");
    }
    if (coupon.validFrom > new Date()) throw new BadRequestException("This coupon is not active yet.");
    if (coupon.validTo && coupon.validTo < new Date()) throw new BadRequestException("This coupon has expired.");
    if (params.subtotal < coupon.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}.`);
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException("This coupon has reached its usage limit.");
    }

    const [foodUsage, groceryUsage] = await Promise.all([
      this.prisma.order.count({
        where: { userId: params.userId, couponId: coupon.id, status: { not: "CANCELLED" } },
      }),
      this.prisma.groceryOrder.count({
        where: { userId: params.userId, couponId: coupon.id, status: { not: "CANCELLED" } },
      }),
    ]);
    if (foodUsage + groceryUsage >= coupon.perUserLimit) {
      throw new BadRequestException("You have already used this coupon the maximum number of times.");
    }

    let discount =
      coupon.type === "PERCENT" ? (params.subtotal * coupon.value) / 100 : coupon.value;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, params.subtotal);

    return { coupon, discount: Math.round(discount * 100) / 100 };
  }

  async recordUsage(couponId: string) {
    await this.prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
  }
}
