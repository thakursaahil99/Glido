import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import { OAuth2Client } from "google-auth-library";
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
  // crypto.randomInt, not Math.random — this is a credential, not UI randomness.
  return randomInt(100000, 1000000).toString();
}

const OTP_MAX_VERIFY_ATTEMPTS = 5;

function isEmail(identifier: string) {
  return identifier.includes("@");
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private otpSender: OtpSenderService,
    private wallet: WalletService,
    private notifications: NotificationsService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get("GOOGLE_CLIENT_ID"));
  }

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

  /** Shared by verifyOtp (login/signup), resetPassword, and verifyRegistration —
   *  checks, rate-limits and consumes the most recent unconsumed OTP for an identifier.
   *  Returns the consumed row (callers that stashed data in pendingPayload need it back). */
  private async consumeOtp(normalized: string, code: string) {
    const otp = await this.prisma.otp.findFirst({
      where: { identifier: normalized, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired OTP.");
    }

    if (otp.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      // Burn it — further guesses against this code are pointless once it's over the limit.
      await this.prisma.otp.update({ where: { id: otp.id }, data: { consumed: true } });
      throw new UnauthorizedException("Too many attempts. Please request a new OTP.");
    }

    if (otp.code !== code) {
      await this.prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("Invalid or expired OTP.");
    }

    return this.prisma.otp.update({ where: { id: otp.id }, data: { consumed: true } });
  }

  async verifyOtp(identifier: string, code: string, name?: string) {
    const normalized = identifier.trim().toLowerCase();
    await this.consumeOtp(normalized, code);

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

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.createUserWithReferral({
      name,
      email: isEmail(normalized) ? normalized : undefined,
      phone: isEmail(normalized) ? undefined : normalized,
      passwordHash,
      referralCode,
    });

    return this.issueTokens(user.id, user.role);
  }

  /** Step 1 of email-OTP signup: validates email+phone are both free, stashes the
   *  pending account details on the OTP row, and emails a code to the address. The
   *  account itself isn't created until verifyRegistration() confirms that code. */
  async requestRegistrationOtp(name: string, email: string, phone: string, password: string, referralCode?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { phone: normalizedPhone }] },
    });
    if (existing) {
      throw new BadRequestException("An account with this email or phone already exists. Try logging in.");
    }

    if (referralCode) {
      const referrer = await this.prisma.user.findUnique({ where: { referralCode: referralCode.trim() } });
      if (!referrer) throw new BadRequestException("Invalid referral code.");
    }

    const recentCount = await this.prisma.otp.count({
      where: {
        identifier: normalizedEmail,
        createdAt: { gte: new Date(Date.now() - OTP_MAX_ATTEMPTS_WINDOW_MINUTES * 60 * 1000) },
      },
    });
    if (recentCount >= 5) {
      throw new BadRequestException("Too many OTP requests. Please try again in a few minutes.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();
    await this.prisma.otp.create({
      data: {
        identifier: normalizedEmail,
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        pendingPayload: JSON.stringify({ name, phone: normalizedPhone, passwordHash, referralCode }),
      },
    });

    await this.otpSender.send(normalizedEmail, code);
    return { message: "OTP sent to your email.", expiresInSeconds: OTP_TTL_MINUTES * 60 };
  }

  /** Step 2 of email-OTP signup: verifies the code, then creates the account from the
   *  payload stashed in requestRegistrationOtp. Re-checks email/phone are still free —
   *  someone else could have registered in the gap while this OTP was outstanding. */
  async verifyRegistration(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otp = await this.consumeOtp(normalizedEmail, code);

    if (!otp.pendingPayload) {
      throw new BadRequestException("This code isn't for a pending signup. Request a new one.");
    }
    const pending = JSON.parse(otp.pendingPayload) as {
      name: string;
      phone: string;
      passwordHash: string;
      referralCode?: string;
    };

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { phone: pending.phone }] },
    });
    if (existing) {
      throw new BadRequestException("An account with this email or phone already exists. Try logging in.");
    }

    const user = await this.createUserWithReferral({
      name: pending.name,
      email: normalizedEmail,
      phone: pending.phone,
      passwordHash: pending.passwordHash,
      referralCode: pending.referralCode,
    });

    return this.issueTokens(user.id, user.role);
  }

  private async createUserWithReferral(params: {
    name: string;
    email?: string;
    phone?: string;
    passwordHash: string;
    referralCode?: string;
  }) {
    let referrer: { id: string } | null = null;
    if (params.referralCode) {
      referrer = await this.prisma.user.findUnique({ where: { referralCode: params.referralCode.trim() } });
      if (!referrer) throw new BadRequestException("Invalid referral code.");
    }

    const user = await this.prisma.user.create({
      data: {
        name: params.name,
        email: params.email,
        phone: params.phone,
        passwordHash: params.passwordHash,
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

    return user;
  }

  /** Sends a password-reset OTP — reuses the same delivery/rate-limit path as
   *  requestOtp. Doesn't reveal whether the identifier has an account. */
  async requestPasswordReset(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: isEmail(normalized) ? { email: normalized } : { phone: normalized },
    });
    // Same response either way — confirming "no account with that identifier" would
    // let an attacker enumerate registered emails/phones one guess at a time.
    if (!user || !user.passwordHash) {
      return { message: "If an account exists for that email/phone, we've sent a reset code." };
    }
    await this.requestOtp(normalized);
    return { message: "If an account exists for that email/phone, we've sent a reset code." };
  }

  async resetPassword(identifier: string, code: string, newPassword: string) {
    const normalized = identifier.trim().toLowerCase();
    await this.consumeOtp(normalized, code);

    const user = await this.prisma.user.findFirst({
      where: isEmail(normalized) ? { email: normalized } : { phone: normalized },
    });
    if (!user || !user.passwordHash) {
      throw new BadRequestException("No password-based account found for that email/phone.");
    }
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("This account has been blocked. Contact Glido support.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // A password reset is the moment to assume every existing session might be
      // compromised (that's often *why* someone resets) — sign out everywhere.
      this.prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } }),
    ]);

    return { message: "Password updated. Please log in again." };
  }

  /** Revokes every active refresh token for a user — "sign out everywhere",
   *  callable by the user themselves (from a logged-in session). */
  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    return { message: "Signed out of all devices." };
  }

  async googleLogin(idToken: string, referralCode?: string) {
    const clientId = this.config.get("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw new BadRequestException("Google sign-in isn't configured yet.");
    }

    let payload: { email?: string; email_verified?: boolean; name?: string };
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException("Invalid Google sign-in token.");
    }

    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException("Could not verify your Google account email.");
    }

    const normalized = payload.email.trim().toLowerCase();
    let user = await this.prisma.user.findFirst({ where: { email: normalized } });

    if (!user) {
      let referrer: { id: string } | null = null;
      if (referralCode) {
        referrer = await this.prisma.user.findUnique({ where: { referralCode: referralCode.trim() } });
      }

      user = await this.prisma.user.create({
        data: {
          email: normalized,
          name: payload.name ?? null,
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
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("This account has been blocked. Contact Glido support.");
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

    // `jti` is a short, high-entropy random id — NOT the userId-prefixed string
    // this used to be. bcrypt silently truncates its input at 72 bytes, and a
    // JWT (or a userId-prefixed jti) is long enough that every token for the
    // same user shared an identical first-72-byte prefix (fixed JWT header +
    // same "sub"/userId), so bcrypt.compare() was matching ANY of a user's
    // tokens against ANY of their tokenHash rows — refresh-token rotation and
    // reuse-detection were both silently broken. Hashing just this random jti
    // (well under 72 bytes, no shared prefix between tokens) fixes it.
    const jti = randomBytes(32).toString("hex");
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN") ?? "30d",
      },
    );

    const tokenHash = await bcrypt.hash(jti, 10);
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
    let payload: { sub: string; jti: string };
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
    });

    let matched: (typeof tokens)[number] | null = null;
    for (const t of tokens) {
      // Compare the short random jti extracted from the *verified* JWT, not the raw
      // external token string — see the comment in issueTokens for why bcrypt-hashing
      // the full token was broken.
      if (await bcrypt.compare(payload.jti, t.tokenHash)) {
        matched = t;
        break;
      }
    }

    if (!matched) {
      // Not among the live tokens — check whether it's a *previously revoked* one
      // (i.e. already rotated away). Presenting an already-used refresh token is
      // the classic sign of a stolen token being replayed after the legitimate
      // client already refreshed: revoke the whole session family so the thief's
      // rotated copy stops working too, not just this one attempt.
      const revoked = await this.prisma.refreshToken.findMany({
        where: { userId: payload.sub, revoked: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      for (const t of revoked) {
        if (await bcrypt.compare(payload.jti, t.tokenHash)) {
          await this.prisma.refreshToken.updateMany({
            where: { userId: payload.sub, revoked: false },
            data: { revoked: true },
          });
          throw new UnauthorizedException("This session was already used elsewhere and has been signed out for safety.");
        }
      }
      throw new UnauthorizedException("Refresh token not recognized.");
    }

    await this.prisma.refreshToken.update({ where: { id: matched.id }, data: { revoked: true } });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("This account has been blocked.");
    }

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    let payload: { sub: string; jti: string };
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
      if (await bcrypt.compare(payload.jti, t.tokenHash)) {
        await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
        break;
      }
    }
    return { message: "Logged out." };
  }
}
