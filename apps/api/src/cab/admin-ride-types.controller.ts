import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpsertRideTypeDto } from "./dto/ride-types.dto";
import { RideTypesService } from "./ride-types.service";

@ApiTags("admin-cab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_rides")
@Controller("admin/cab/ride-types")
export class AdminRideTypesController {
  constructor(private rideTypes: RideTypesService) {}

  @Get()
  list() {
    return this.rideTypes.listAll();
  }

  @Post()
  create(@Body() dto: UpsertRideTypeDto) {
    return this.rideTypes.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpsertRideTypeDto) {
    return this.rideTypes.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.rideTypes.remove(id);
  }
}
