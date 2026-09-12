import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateDriverDto, UpdateDriverDto } from "./dto/drivers.dto";
import { DriversService } from "./drivers.service";

@ApiTags("admin-cab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_drivers")
@Controller("admin/cab/drivers")
export class AdminDriversController {
  constructor(private drivers: DriversService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "50",
  ) {
    return this.drivers.list({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.drivers.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDriverDto) {
    return this.drivers.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.drivers.remove(id);
  }
}
