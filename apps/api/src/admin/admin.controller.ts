import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { AuditLogService } from "../audit/audit-log.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminService } from "./admin.service";
import { BannersService } from "./banners.service";
import { ReportsService } from "./reports.service";

class BannerDto {
  @IsString()
  title: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(
    private adminService: AdminService,
    private bannersService: BannersService,
    private auditLogService: AuditLogService,
    private reportsService: ReportsService,
  ) {}

  @Get("dashboard")
  @RequirePermissions("view_dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get("reports/overview")
  @RequirePermissions("view_reports")
  reportsOverview(@Query("range") range = "30") {
    const rangeDays = [7, 30, 90].includes(Number(range)) ? Number(range) : 30;
    return this.reportsService.overview(rangeDays);
  }

  @Get("audit-log")
  @RequirePermissions("manage_staff")
  auditLog(@Query("page") page = "1", @Query("pageSize") pageSize = "30", @Query("entity") entity?: string) {
    return this.auditLogService.list({ page: Number(page), pageSize: Number(pageSize), entity });
  }

  @Get("banners")
  @RequirePermissions("manage_banners")
  listBanners() {
    return this.bannersService.listAll();
  }

  @Post("banners")
  @RequirePermissions("manage_banners")
  createBanner(@Body() dto: BannerDto) {
    return this.bannersService.create(dto);
  }

  @Patch("banners/:id")
  @RequirePermissions("manage_banners")
  updateBanner(@Param("id") id: string, @Body() dto: BannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Delete("banners/:id")
  @RequirePermissions("manage_banners")
  removeBanner(@Param("id") id: string) {
    return this.bannersService.remove(id);
  }
}
