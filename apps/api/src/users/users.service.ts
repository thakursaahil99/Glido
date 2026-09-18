import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../audit/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { RedeemLoyaltyPointsDto, UpdateMeDto, UpdateUserStatusDto, UpsertAddressDto } from "./dto/users.dto";

// 1 loyalty point redeems for ₹1 of wallet credit.
const LOYALTY_POINT_VALUE_RUPEES = 1;

// Never send the bcrypt hash to a client — every method below that returns a
// raw User row (or a list of them) must pass its result(s) through this first.
function omitPasswordHash<T extends { passwordHash?: string | null }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private auditLog: AuditLogService, private wallet: WalletService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true, wallet: true },
    });
    if (!user) throw new NotFoundException("User not found.");
    return omitPasswordHash(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (dto.phone) {
      const existing = await this.prisma.user.findFirst({ where: { phone: dto.phone, id: { not: userId } } });
      if (existing) throw new BadRequestException("This phone number is already linked to another account.");
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return omitPasswordHash(updated);
  }

  listAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async addAddress(userId: string, dto: UpsertAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async updateAddress(userId: string, addressId: string, dto: UpsertAddressDto) {
    const existing = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!existing) throw new NotFoundException("Address not found.");
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!existing) throw new NotFoundException("Address not found.");
    await this.prisma.address.delete({ where: { id: addressId } });
    return { message: "Address deleted." };
  }

  async referralSummary(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw new NotFoundException("User not found.");
    const [referredCount, earnings] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.walletTransaction.aggregate({
        where: { wallet: { userId }, reason: "Referral bonus" },
        _sum: { amount: true },
      }),
    ]);
    return { referralCode: user.referralCode, referredCount, totalEarned: earnings._sum.amount ?? 0 };
  }

  async redeemLoyaltyPoints(userId: string, dto: RedeemLoyaltyPointsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } });
    if (!user) throw new NotFoundException("User not found.");
    if (dto.points > user.loyaltyPoints) {
      throw new BadRequestException(`You only have ${user.loyaltyPoints} points available.`);
    }
    const creditAmount = dto.points * LOYALTY_POINT_VALUE_RUPEES;
    await this.prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: { decrement: dto.points } } });
    await this.wallet.credit(userId, creditAmount, "Loyalty points redeemed");
    return { redeemedPoints: dto.points, creditedAmount: creditAmount };
  }

  // --- Admin ---
  async adminList(params: { search?: string; status?: string; role?: string; page: number; pageSize: number }) {
    const { search, status, role, page, pageSize } = params;
    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(omitPasswordHash), total, page, pageSize };
  }

  async adminDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        wallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true, restaurant: { select: { name: true } } },
        },
        groceryOrders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
        rides: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, rideNumber: true, status: true, estimatedFare: true, finalFare: true, createdAt: true },
        },
        referrals: { select: { id: true, name: true, phone: true, email: true, createdAt: true } },
        referredBy: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException("User not found.");
    return omitPasswordHash(user);
  }

  async adminUpdateStatus(userId: string, dto: UpdateUserStatusDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found.");
    if (user.role === "ADMIN") {
      throw new BadRequestException("Manage staff accounts from Admin → Staff instead.");
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status: dto.status } });
    await this.auditLog.record({
      adminUserId: actorId,
      action: "USER_STATUS_CHANGED",
      entity: "User",
      entityId: userId,
      before: { status: user.status },
      after: { status: updated.status },
    });
    return omitPasswordHash(updated);
  }
}
