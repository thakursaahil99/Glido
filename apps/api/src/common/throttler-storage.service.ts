import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Postgres-backed ThrottlerStorage, shared across every serverless instance —
 * @nestjs/throttler's default storage is an in-memory Map local to one process,
 * which on Vercel means each concurrent instance has its own counters and the
 * configured limits don't actually hold (one attacker can just get load-balanced
 * across instances). This uses the same Postgres database as everything else
 * instead of standing up a separate Redis/Upstash service.
 */
@Injectable()
export class PrismaThrottlerStorage implements ThrottlerStorage {
  constructor(private prisma: PrismaService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const now = new Date();
    const existing = await this.prisma.throttleHit.findUnique({ where: { key } });

    if (!existing || existing.expiresAt <= now) {
      // Fresh window. (Tiny race if two requests land here simultaneously — both
      // reset to count 1 — acceptable for a rate limiter, not a security hole.)
      const expiresAt = new Date(now.getTime() + ttl);
      await this.prisma.throttleHit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt, blockedUntil: null },
        update: { count: 1, expiresAt, blockedUntil: null },
      });

      // Opportunistic cleanup of long-expired rows — no cron needed for a table
      // this small-cardinality; just sweep occasionally on a fresh-window write.
      if (Math.random() < 0.02) {
        const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.prisma.throttleHit.deleteMany({ where: { expiresAt: { lt: staleCutoff } } }).catch(() => undefined);
      }

      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
    }

    if (existing.blockedUntil && existing.blockedUntil > now) {
      return {
        totalHits: existing.count,
        timeToExpire: Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000),
      };
    }

    const updated = await this.prisma.throttleHit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    const isBlocked = updated.count > limit;
    let blockedUntil = existing.blockedUntil;
    if (isBlocked && blockDuration > 0 && (!blockedUntil || blockedUntil <= now)) {
      blockedUntil = new Date(now.getTime() + blockDuration);
      await this.prisma.throttleHit.update({ where: { key }, data: { blockedUntil } });
    }

    return {
      totalHits: updated.count,
      timeToExpire: Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked && blockedUntil ? Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000) : 0,
    };
  }
}
