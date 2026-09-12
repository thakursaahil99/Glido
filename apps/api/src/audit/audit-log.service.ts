import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async record(params: {
    adminUserId: string;
    action: string;
    entity: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    ip?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        beforeJson: params.before !== undefined ? JSON.stringify(params.before) : undefined,
        afterJson: params.after !== undefined ? JSON.stringify(params.after) : undefined,
        ip: params.ip,
      },
    });
  }

  list(params: { page: number; pageSize: number; entity?: string; adminUserId?: string }) {
    const { page, pageSize, entity, adminUserId } = params;
    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (adminUserId) where.adminUserId = adminUserId;
    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }
}
