import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateRideStatusDto } from "./dto/rides.dto";
import { RidesService } from "./rides.service";

@ApiTags("admin-cab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_rides")
@Controller("admin/cab/rides")
export class AdminRidesController {
  constructor(private rides: RidesService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.rides.adminList({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.rides.adminDetail(id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateRideStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.rides.adminUpdateStatus(id, dto.status, dto.note, actor.id);
  }
}
