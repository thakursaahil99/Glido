import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import Razorpay from "razorpay";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private realtime: RealtimeGateway,
  ) {
    const keyId = this.config.get("RAZORPAY_KEY_ID");
    const keySecret = this.config.get("RAZORPAY_KEY_SECRET");
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  get isConfigured() {
    return this.razorpay !== null;
  }

  /** Creates (or reuses) a Payment record + Razorpay order for an ONLINE order. */
  async createOrderForPayment(orderId: string, amount: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");

    if (!this.razorpay) {
      // Demo fallback — no Razorpay test keys configured. The web checkout
      // will detect `mock: true` and let the customer "pay" instantly so the
      // whole flow still works end-to-end without any paid account.
      const payment = await this.prisma.payment.upsert({
        where: { orderId },
        update: { amount, method: "ONLINE", provider: "mock" },
        create: { orderId, amount, method: "ONLINE", provider: "mock", status: "PENDING" },
      });
      return { mock: true, paymentId: payment.id, amount, currency: "INR" };
    }

    const rpOrder = await this.razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: order.orderNumber,
    });

    await this.prisma.payment.upsert({
      where: { orderId },
      update: { amount, method: "ONLINE", provider: "razorpay", providerOrderId: rpOrder.id },
      create: {
        orderId,
        amount,
        method: "ONLINE",
        provider: "razorpay",
        providerOrderId: rpOrder.id,
        status: "PENDING",
      },
    });

    return {
      mock: false,
      keyId: this.config.get("RAZORPAY_KEY_ID"),
      razorpayOrderId: rpOrder.id,
      amount,
      currency: "INR",
    };
  }

  async verifySignature(
    userId: string,
    params: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    await this.assertOwnedByUser(params.orderId, userId);

    const secret = this.config.get("RAZORPAY_KEY_SECRET");
    if (!secret) throw new BadRequestException("Payment gateway not configured.");

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(params.razorpaySignature, "hex");
    const signatureMatches =
      expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!signatureMatches) {
      await this.markFailed(params.orderId, "Signature mismatch");
      throw new BadRequestException("Payment verification failed.");
    }

    return this.markPaid(params.orderId, params.razorpayPaymentId);
  }

  /** Demo-mode "payment" when no Razorpay keys are configured — skips signature check. */
  async mockPay(userId: string, orderId: string) {
    await this.assertOwnedByUser(orderId, userId);
    return this.markPaid(orderId, `mock_${Date.now()}`);
  }

  private async assertOwnedByUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.userId !== userId) throw new ForbiddenException("This order does not belong to you.");
  }

  private async markPaid(orderId: string, providerPaymentId: string) {
    const payment = await this.prisma.payment.update({
      where: { orderId },
      data: { status: "PAID", providerPaymentId },
    });
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID" },
    });
    this.realtime.emitOrderUpdate(orderId, { orderId, paymentStatus: "PAID", status: order.status });
    return payment;
  }

  private async markFailed(orderId: string, _reason: string) {
    await this.prisma.payment
      .update({ where: { orderId }, data: { status: "FAILED" } })
      .catch(() => undefined);
  }
}
