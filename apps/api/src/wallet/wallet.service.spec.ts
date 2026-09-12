import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "./wallet.service";

describe("WalletService", () => {
  let service: WalletService;
  let prisma: {
    wallet: { upsert: jest.Mock; update: jest.Mock };
    walletTransaction: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      wallet: { upsert: jest.fn(), update: jest.fn() },
      walletTransaction: { create: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    notifications = { notify: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(WalletService);
  });

  describe("debit", () => {
    it("throws when the wallet balance is insufficient", async () => {
      prisma.wallet.upsert.mockResolvedValue({ id: "w1", balance: 50 });

      await expect(service.debit("u1", 100, "Order payment")).rejects.toThrow(BadRequestException);
      expect(prisma.wallet.update).not.toHaveBeenCalled();
    });

    it("decrements the balance and records a DEBIT transaction when funds are sufficient", async () => {
      prisma.wallet.upsert.mockResolvedValue({ id: "w1", balance: 200 });
      prisma.wallet.update.mockResolvedValue({ id: "w1", balance: 100 });

      const result = await service.debit("u1", 100, "Order payment", "order-1");

      expect(result.balance).toBe(100);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w1" },
        data: { balance: { decrement: 100 } },
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith({
        data: { walletId: "w1", type: "DEBIT", amount: 100, reason: "Order payment", referenceId: "order-1" },
      });
    });

    it("allows a debit that exactly matches the balance (boundary case)", async () => {
      prisma.wallet.upsert.mockResolvedValue({ id: "w1", balance: 100 });
      prisma.wallet.update.mockResolvedValue({ id: "w1", balance: 0 });

      await expect(service.debit("u1", 100, "Exact spend")).resolves.toEqual({ id: "w1", balance: 0 });
    });
  });

  describe("credit", () => {
    it("increments the balance and records a CREDIT transaction", async () => {
      prisma.wallet.upsert.mockResolvedValue({ id: "w1", balance: 50 });
      prisma.wallet.update.mockResolvedValue({ id: "w1", balance: 150 });

      const result = await service.credit("u1", 100, "Refund");

      expect(result.balance).toBe(150);
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith({
        data: { walletId: "w1", type: "CREDIT", amount: 100, reason: "Refund", referenceId: undefined },
      });
    });
  });

  describe("topUp", () => {
    it("rejects a non-positive amount", async () => {
      await expect(service.topUp("u1", 0)).rejects.toThrow(BadRequestException);
      await expect(service.topUp("u1", -10)).rejects.toThrow(BadRequestException);
      expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    });

    it("credits the wallet and sends a notification for a valid amount", async () => {
      prisma.wallet.upsert.mockResolvedValue({ id: "w1", balance: 0 });
      prisma.wallet.update.mockResolvedValue({ id: "w1", balance: 500 });

      await service.topUp("u1", 500);

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "CREDIT", amount: 500 }) }),
      );
      expect(notifications.notify).toHaveBeenCalledWith("u1", "Wallet topped up", expect.stringContaining("500.00"), "SYSTEM");
    });
  });
});
