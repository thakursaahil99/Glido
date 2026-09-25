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

  /** Demo-mode top-up — credits instantly, standing in for a real payment gateway charge.
   *  There's no real money behind this, so it's capped per-request (DTO) and per-day here
   *  to stop it being used to mint unlimited wallet balance via many small requests. */
  async topUp(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException("Enter a valid amount.");

    const wallet = await this.getOrCreate(userId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toppedUpToday = await this.prisma.walletTransaction.aggregate({
      where: { walletId: wallet.id, type: "CREDIT", reason: "Wallet top-up", createdAt: { gte: since } },
      _sum: { amount: true },
    });
    const dailyCap = 2000;
    const alreadyToday = toppedUpToday._sum.amount ?? 0;
    if (alreadyToday + amount > dailyCap) {
      throw new BadRequestException(`Demo top-up is capped at ₹${dailyCap} per day. You've already added ₹${alreadyToday.toFixed(2)} today.`);
    }

    const updated = await this.credit(userId, amount, "Wallet top-up");
    this.notifications.notify(userId, "Wallet topped up", `₹${amount.toFixed(2)} added to your Glido Wallet.`, "SYSTEM");
    return updated;
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
    // The balance check above reads outside the transaction, so two concurrent debits
    // (e.g. two orders paid from the same wallet at the same instant) could both pass
    // it before either lands. Re-check the post-decrement balance inside the
    // transaction and throw to roll it back if it went negative — the DB-level
    // decrement is still atomic, this just refuses to let it go below zero.
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      if (updated.balance < 0) {
        throw new BadRequestException("Insufficient wallet balance.");
      }
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, type: "DEBIT", amount, reason, referenceId },
      });
      return updated;
    });
  }
}
