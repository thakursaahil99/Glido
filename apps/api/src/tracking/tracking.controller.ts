import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateRiderLocationDto } from "./dto/tracking.dto";
import { TrackingService } from "./tracking.service";

@ApiTags("tracking")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TrackingController {
  constructor(private tracking: TrackingService) {}

  /** REST path for rider GPS fixes — the rider app falls back to this whenever its
   *  socket isn't connected (always the case against the serverless deployment). */
  @Patch("delivery-partner/me/location")
  @Roles("DELIVERY_PARTNER")
  updateLocation(@CurrentUser() user: AuthUser, @Body() dto: UpdateRiderLocationDto) {
    return this.tracking.updateRiderLocation(user.id, dto);
  }

  @Get("orders/:id/tracking")
  orderTracking(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tracking.getOrderTracking(id, user);
  }
}
