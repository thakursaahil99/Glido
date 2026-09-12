import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertRideTypeDto } from "./dto/ride-types.dto";

@Injectable()
export class RideTypesService {
  constructor(private prisma: PrismaService) {}

  listActive() {
    return this.prisma.rideType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  listAll() {
    return this.prisma.rideType.findMany({ orderBy: { sortOrder: "asc" } });
  }

  create(dto: UpsertRideTypeDto) {
    return this.prisma.rideType.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertRideTypeDto>) {
    const existing = await this.prisma.rideType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ride type not found.");
    return this.prisma.rideType.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.rideType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ride type not found.");
    await this.prisma.rideType.delete({ where: { id } });
    return { message: "Ride type deleted." };
  }
}
