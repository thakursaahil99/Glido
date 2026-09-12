import { Injectable } from "@nestjs/common";
import { AuditLogService } from "../audit/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";

export interface PlatformSettings {
  taxRatePercent: number;
  groceryDeliveryFee: number;
  groceryFreeDeliveryThreshold: number;
}

const DEFAULTS: PlatformSettings = {
  taxRatePercent: 5,
  groceryDeliveryFee: 25,
  groceryFreeDeliveryThreshold: 299,
};

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async getAll(): Promise<PlatformSettings> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
    const overrides: Partial<PlatformSettings> = {};
    for (const row of rows) {
      (overrides as Record<string, number>)[row.key] = JSON.parse(row.value);
    }
    return { ...DEFAULTS, ...overrides };
  }

  /** Tax rate as a fraction (e.g. 0.05) for use in fare/total calculations. */
  async getTaxRate(): Promise<number> {
    const { taxRatePercent } = await this.getAll();
    return taxRatePercent / 100;
  }

  async update(partial: Partial<PlatformSettings>, actorId: string) {
    const before = await this.getAll();
    await this.prisma.$transaction(
      Object.entries(partial)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) =>
          this.prisma.setting.upsert({
            where: { key },
            update: { value: JSON.stringify(value) },
            create: { key, value: JSON.stringify(value) },
          }),
        ),
    );
    const after = await this.getAll();
    await this.auditLog.record({
      adminUserId: actorId,
      action: "SETTINGS_UPDATED",
      entity: "Setting",
      before,
      after,
    });
    return after;
  }
}
