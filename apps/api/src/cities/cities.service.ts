import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface UpsertCityData {
  name?: string;
  state?: string;
  centerLat?: number;
  centerLng?: number;
  serviceRadiusKm?: number;
  isActive?: boolean;
}

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.city.findMany({ orderBy: { name: "asc" } });
  }

  /** Active, geo-configured zones — used to validate Cab pickup locations fall within a serviceable area. */
  listActiveZones() {
    return this.prisma.city.findMany({
      where: { isActive: true, centerLat: { not: null }, centerLng: { not: null } },
    });
  }

  create(data: UpsertCityData) {
    return this.prisma.city.create({ data: { name: data.name!, ...data } });
  }

  async update(id: string, data: UpsertCityData) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException("City not found.");
    return this.prisma.city.update({ where: { id }, data });
  }

  async remove(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException("City not found.");
    await this.prisma.city.delete({ where: { id } });
    return { message: "City deleted." };
  }
}
