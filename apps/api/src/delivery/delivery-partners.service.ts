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

  /** Resolves the delivery partner linked to this user, or throws — used by every /delivery-partner/me endpoint. */
  async findByUser(userId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException("No delivery partner profile is linked to this account.");
    return partner;
  }
}
