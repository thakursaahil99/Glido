import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CancelRideDto, CreateRideDto, EstimateRideDto } from "./dto/rides.dto";
import { RidesService } from "./rides.service";

@ApiTags("cab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cab/rides")
export class RidesController {
  constructor(private rides: RidesService) {}

  @Post("estimate")
  estimate(@Body() dto: EstimateRideDto) {
    return this.rides.estimate(dto);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRideDto) {
    return this.rides.create(user.id, dto);
  }

  @Get("me")
  mine(@CurrentUser() user: AuthUser, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.rides.findMineList(user.id, Number(page), Number(pageSize));
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.rides.findOneForUser(user.id, id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CancelRideDto) {
    return this.rides.cancel(user.id, id, dto.reason);
  }
}
