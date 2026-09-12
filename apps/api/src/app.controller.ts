import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { PrismaService } from "./prisma/prisma.service";

@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  /** Liveness/readiness probe for Docker/hosting platforms — checks the DB connection too. */
  @Get("health")
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "up", timestamp: new Date().toISOString() };
    } catch {
      return { status: "error", db: "down", timestamp: new Date().toISOString() };
    }
  }
}
