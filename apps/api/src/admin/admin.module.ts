import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { BannersService } from "./banners.service";
import { PublicContentController } from "./public-content.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuditLogModule],
  controllers: [AdminController, PublicContentController],
  providers: [AdminService, BannersService, ReportsService],
})
export class AdminModule {}
