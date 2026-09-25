import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { DriverStatus, Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { haversineDistanceKm } from "../cab/geo.util";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDeliveryPartnerAccountDto, CreateDeliveryPartnerDto, UpdateDeliveryPartnerDto } from "./dto/delivery-partners.dto";

@Injectable()
export class DeliveryPartnersService {
  constructor(private prisma: PrismaService) {}

  list(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: Prisma.DeliveryPartnerWhereInput = status ? { status: status as DriverStatus } : {};
    return Promise.all([
      this.prisma.deliveryPartner.findMany({
        where,
        include: { city: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deliveryPartner.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  create(dto: CreateDeliveryPartnerDto) {
    return this.prisma.deliveryPartner.create({ data: dto });
  }

  async update(id: string, dto: UpdateDeliveryPartnerDto) {
    const existing = await this.prisma.deliveryPartner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Delivery partner not found.");
    return this.prisma.deliveryPartner.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.deliveryPartner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Delivery partner not found.");
    await this.prisma.deliveryPartner.delete({ where: { id } });
    return { message: "Delivery partner deleted." };
  }

  /** Assigns the nearest available online partner (or just the first one, if pickup coordinates aren't known). */
  async tryAssign(pickupLat?: number | null, pickupLng?: number | null) {
    const candidates = await this.prisma.deliveryPartner.findMany({
      where: { status: "APPROVED", isOnline: true, isAvailable: true },
    });
    if (candidates.length === 0) return null;

    let nearest = candidates[0];
    if (pickupLat != null && pickupLng != null) {
      let nearestDist = Infinity;
      for (const candidate of candidates) {
        if (candidate.currentLat == null || candidate.currentLng == null) continue;
        const dist = haversineDistanceKm(pickupLat, pickupLng, candidate.currentLat, candidate.currentLng);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = candidate;
        }
      }
    }

    await this.prisma.deliveryPartner.update({ where: { id: nearest.id }, data: { isAvailable: false } });
    return nearest;
  }

  async release(id: string) {
    await this.prisma.deliveryPartner.update({ where: { id }, data: { isAvailable: true } }).catch(() => undefined);
  }

  /** Creates a DELIVERY_PARTNER login for a partner that doesn't have an account yet. */
  async createAccount(id: string, dto: CreateDeliveryPartnerAccountDto) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException("Delivery partner not found.");
    if (partner.userId) throw new BadRequestException("This delivery partner already has an account.");

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A user with this email already exists.");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: partner.name, email, passwordHash, role: "DELIVERY_PARTNER" },
    });
    await this.prisma.deliveryPartner.update({ where: { id }, data: { userId: user.id } });
    return { message: "Delivery partner account created.", email: user.email };
  }

  /** Validates a partner is eligible to be manually assigned an order by an admin —
   *  must exist and be APPROVED (an admin overriding onto a suspended/pending partner
   *  would be a support nightmare, not a convenience). Doesn't check isOnline/isAvailable
   *  since a manual override is explicitly for cases where auto-assign already failed. */
  async getForManualAssign(id: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException("Delivery partner not found.");
    if (partner.status !== "APPROVED") {
      throw new BadRequestException("Only approved delivery partners can be assigned to orders.");
    }
    return partner;
  }

  /** Resolves the delivery partner linked to this user, or throws — used by every /delivery-partner/me endpoint. */
  async findByUser(userId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException("No delivery partner profile is linked to this account.");
    return partner;
  }

  /** Real delivered-order counts/earnings for this partner — today and the last 7 days,
   *  derived from actual DELIVERED orders' deliveryFee, not a fabricated/estimated figure. */
  async getStats(partnerId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayFood, todayGrocery, weekFood, weekGrocery] = await Promise.all([
      this.prisma.order.aggregate({
        where: { deliveryPartnerId: partnerId, status: "DELIVERED", updatedAt: { gte: startOfToday } },
        _count: true,
        _sum: { deliveryFee: true },
      }),
      this.prisma.groceryOrder.aggregate({
        where: { deliveryPartnerId: partnerId, status: "DELIVERED", updatedAt: { gte: startOfToday } },
        _count: true,
        _sum: { deliveryFee: true },
      }),
      this.prisma.order.aggregate({
        where: { deliveryPartnerId: partnerId, status: "DELIVERED", updatedAt: { gte: sevenDaysAgo } },
        _count: true,
        _sum: { deliveryFee: true },
      }),
      this.prisma.groceryOrder.aggregate({
        where: { deliveryPartnerId: partnerId, status: "DELIVERED", updatedAt: { gte: sevenDaysAgo } },
        _count: true,
        _sum: { deliveryFee: true },
      }),
    ]);

    return {
      today: {
        deliveries: todayFood._count + todayGrocery._count,
        earnings: (todayFood._sum.deliveryFee ?? 0) + (todayGrocery._sum.deliveryFee ?? 0),
      },
      last7Days: {
        deliveries: weekFood._count + weekGrocery._count,
        earnings: (weekFood._sum.deliveryFee ?? 0) + (weekGrocery._sum.deliveryFee ?? 0),
      },
    };
  }
}
