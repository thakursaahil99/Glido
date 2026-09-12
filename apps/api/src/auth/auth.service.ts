import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { OtpSenderService } from "./otp-sender.service";

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS_WINDOW_MINUTES = 10;
// Demo-mode referral bonuses — credited instantly to both wallets on signup
// (same "instant credit" pattern as WalletService.topUp) rather than waiting
// on the referee's first order, to keep the reward loop simple to test.
const REFERRAL_REFEREE_BONUS = 50;
const REFERRAL_REFERRER_BONUS = 100;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isEmail(identifier: string) {
  return identifier.includes("@");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private otpSender: OtpSenderService,
    private wallet: WalletService,
    private notifications: NotificationsService,
  ) {}

  async requestOtp(identifier: string) {
    const normalized = identifier.trim().toLowerCase();

    const recentCount = await this.prisma.otp.count({
      where: {
        identifier: normalized,
        createdAt: { gte: new Date(Date.now() - OTP_MAX_ATTEMPTS_WINDOW_MINUTES * 60 * 1000) },
      },
    });
    if (recentCount >= 5) {
      throw new BadRequestException("Too many OTP requests. Please try again in a few minutes.");
    }

    const code = generateCode();
    await this.prisma.otp.create({
      data: {
        identifier: normalized,
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    await this.otpSender.send(normalized, code);

    return { message: "OTP sent.", expiresInSeconds: OTP_TTL_MINUTES * 60 };
  }

  async verifyOtp(identifier: string, code: string, name?: string) {
    const normalized = identifier.trim().toLowerCase();

    const otp = await this.prisma.otp.findFirst({
      where: { identifier: normalized, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.code !== code || otp.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired OTP.");
    }

    await this.prisma.otp.update({ where: { id: otp.id }, data: { consumed: true } });

    let user = await this.prisma.user.findFirst({
      where: isEmail(normalized) ? { email: normalized } : { phone: normalized },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: isEmail(normalized) ? normalized : undefined,
          phone: isEmail(normalized) ? undefined : normalized,
          name: name ?? null,
          wallet: { create: { balance: 0 } },
        },
      });
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("This account has been blocked. Contact Glido support.");
    }

    return this.issueTokens(user.id, user.role);
  }

  async register(name: string, identifier: string, password: string, referralCode?: string) {
    const normalized = identifier.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: isEmail(normalized) ? { email: normalized } : { phone: normalized },
    });
    if (existing) {
      throw new BadRequestException("An account with this email/phone already exists. Try logging in.");
    }

    let referrer: { id: string } | null = null;
    if (referralCode) {
      referrer = await this.prisma.user.findUnique({ where: { referralCode: referralCode.trim() } });
      if (!referrer) throw new BadRequestException("Invalid referral code.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        email: isEmail(normalized) ? normalized : undefined,
        phone: isEmail(normalized) ? undefined : normalized,
        passwordHash,
        referredById: referrer?.id,
        wallet: { create: { balance: 0 } },
      },
    });

    if (referrer) {
      await this.wallet.credit(user.id, REFERRAL_REFEREE_BONUS, "Referral welcome bonus");
      await this.wallet.credit(referrer.id, REFERRAL_REFERRER_BONUS, "Referral bonus", user.id);
      this.notifications.notify(
        referrer.id,
        "You earned a referral bonus!",
        `₹${REFERRAL_REFERRER_BONUS.toFixed(2)} added to your wallet — your friend just joined Glido.`,
        "SYSTEM",
      );
    }

    return this.issueTokens(user.id, user.role);
  }

  /** Generic email/phone + password login — used by both customers and staff. */
  async login(identifier: string, password: string) {
    const user = await this.authenticate(identifier, password);
    return this.issueTokens(user.id, user.role);
  }

  async adminLogin(email: string, password: string) {
    const user = await this.authenticate(email, password);
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("This account does not have admin access.");
    }
    return this.issueTokens(user.id, user.role);
  }

  private async authenticate(identifier: string, password: string) {
    const normalized = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: isEmail(normalized) ? { email: normalized } : { phone: normalized },
    });

    // Same error for "no such user" and "wrong password" so we don't leak which accounts exist.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email/phone or password.");
    }
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("This account has been blocked. Contact Glido support.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email/phone or password.");
    }

    return user;
  }

  async issueTokens(userId: string, role: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.get("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get("JWT_ACCESS_EXPIRES_IN") ?? "15m",
      },
    );

    const rawRefreshToken = `${userId}.${bcrypt.genSaltSync(4)}.${Date.now()}`;
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti: rawRefreshToken },
      {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN") ?? "30d",
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        adminRole: user.adminRole,
        permissions: user.permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revoked: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    let matched: (typeof tokens)[number] | null = null;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) {
        matched = t;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException("Refresh token not recognized.");

    await this.prisma.refreshToken.update({ where: { id: matched.id }, data: { revoked: true } });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("This account has been blocked.");
    }

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });
    } catch {
      return { message: "Logged out." };
    }
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revoked: false },
    });
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) {
        await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
        break;
      }
    }
    return { message: "Logged out." };
  }
}
