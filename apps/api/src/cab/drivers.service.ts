import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDriverDto, UpdateDriverDto } from "./dto/drivers.dto";

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  list(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where = status ? { status: status as any } : {};
    return Promise.all([
      this.prisma.driver.findMany({
        where,
        include: { rideType: true, city: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.driver.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, pageSize }));
  }

  create(dto: CreateDriverDto) {
    return this.prisma.driver.create({ data: dto });
  }

  async update(id: string, dto: UpdateDriverDto) {
    const existing = await this.prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Driver not found.");
    return this.prisma.driver.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Driver not found.");
    await this.prisma.driver.delete({ where: { id } });
    return { message: "Driver deleted." };
  }
}
