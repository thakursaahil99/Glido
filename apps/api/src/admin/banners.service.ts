import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  listActive() {
    return this.prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  listAll() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  }

  create(data: { title: string; imageUrl: string; link?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.banner.create({ data });
  }

  async update(id: string, data: Partial<{ title: string; imageUrl: string; link: string; sortOrder: number; isActive: boolean }>) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Banner not found.");
    return this.prisma.banner.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Banner not found.");
    await this.prisma.banner.delete({ where: { id } });
    return { message: "Banner deleted." };
  }
}
