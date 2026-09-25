import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DEFAULT_PERMISSIONS_BY_ADMIN_ROLE } from "@glido/shared";
import type { AdminRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuditLogService } from "../audit/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStaffDto, UpdateStaffDto } from "./dto/staff.dto";

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  adminRole: true,
  permissions: true,
  status: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService, private auditLog: AuditLogService) {}

  list() {
    return this.prisma.user.findMany({
      where: { role: "ADMIN" },
      select: STAFF_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateStaffDto, creatorId: string, creatorAdminRole: AdminRole | null | undefined, ip?: string) {
    if (dto.adminRole === "SUPER_ADMIN" && creatorAdminRole !== "SUPER_ADMIN") {
      // Otherwise any admin holding just `manage_staff` could mint a super-admin
      // account for themselves and bypass every other permission check.
      throw new ForbiddenException("Only a Super Admin can create another Super Admin.");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException("A user with this email already exists.");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const permissions = dto.permissions ?? DEFAULT_PERMISSIONS_BY_ADMIN_ROLE[dto.adminRole];

    const staff = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        adminRole: dto.adminRole,
        permissions,
        createdById: creatorId,
      },
      select: STAFF_SELECT,
    });

    await this.auditLog.record({
      adminUserId: creatorId,
      action: "STAFF_CREATED",
      entity: "User",
      entityId: staff.id,
      after: { email: staff.email, adminRole: staff.adminRole, permissions: staff.permissions },
      ip,
    });

    return staff;
  }

  async update(id: string, dto: UpdateStaffDto, actorId: string, actorAdminRole: AdminRole | null | undefined, ip?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") throw new NotFoundException("Staff member not found.");

    if (dto.adminRole === "SUPER_ADMIN" && target.adminRole !== "SUPER_ADMIN" && actorAdminRole !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only a Super Admin can promote another admin to Super Admin.");
    }

    // Never allow the last active Super Admin to be demoted/blocked — that would lock everyone out.
    const isDemotingSuperAdmin =
      target.adminRole === "SUPER_ADMIN" &&
      ((dto.adminRole && dto.adminRole !== "SUPER_ADMIN") || dto.status === "BLOCKED" || dto.status === "SUSPENDED");
    if (isDemotingSuperAdmin) {
      const otherActiveSuperAdmins = await this.prisma.user.count({
        where: { role: "ADMIN", adminRole: "SUPER_ADMIN", status: "ACTIVE", id: { not: id } },
      });
      if (otherActiveSuperAdmins === 0) {
        throw new BadRequestException("Cannot demote or block the last active Super Admin.");
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.adminRole !== undefined) data.adminRole = dto.adminRole;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.newPassword) data.passwordHash = await bcrypt.hash(dto.newPassword, 10);

    const updated = await this.prisma.user.update({ where: { id }, data, select: STAFF_SELECT });

    await this.auditLog.record({
      adminUserId: actorId,
      action: "STAFF_UPDATED",
      entity: "User",
      entityId: id,
      before: { adminRole: target.adminRole, permissions: target.permissions, status: target.status },
      after: { adminRole: updated.adminRole, permissions: updated.permissions, status: updated.status },
      ip,
    });

    return updated;
  }
}
