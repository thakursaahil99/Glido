import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getOrCreate(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getSummary(userId: string) {
    const wallet = await this.getOrCreate(userId);
    return { balance: wallet.balance };
  }

  async listTransactions(userId: string, page = 1, pageSize = 20) {
    const wallet = await this.getOrCreate(userId);
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Demo-mode top-up — credits instantly, standing in for a real payment gateway charge. */
  async topUp(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException("Enter a valid amount.");
    const wallet = await this.credit(userId, amount, "Wallet top-up");
    this.notifications.notify(userId, "Wallet topped up", `₹${amount.toFixed(2)} added to your Glido Wallet.`, "SYSTEM");
    return wallet;
  }

  async credit(userId: string, amount: number, reason: string, referenceId?: string) {
    const wallet = await this.getOrCreate(userId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, type: "CREDIT", amount, reason, referenceId },
      });
      return updated;
    });
  }

  async debit(userId: string, amount: number, reason: string, referenceId?: string) {
    const wallet = await this.getOrCreate(userId);
    if (wallet.balance < amount) {
      throw new BadRequestException("Insufficient wallet balance.");
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, type: "DEBIT", amount, reason, referenceId },
      });
      return updated;
    });
  }
}
