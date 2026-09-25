import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateStaffDto, UpdateStaffDto } from "./dto/staff.dto";
import { StaffService } from "./staff.service";

@ApiTags("admin-staff")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_staff")
@Controller("admin/staff")
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get()
  list() {
    return this.staffService.list();
  }

  @Post()
  create(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.staffService.create(dto, user.id, user.adminRole, req.ip);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.staffService.update(id, dto, user.id, user.adminRole, req.ip);
  }
}
