import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CancelRideDto, CreateRideDto, CreateRideReviewDto, EstimateRideDto } from "./dto/rides.dto";
import { RidesService } from "./rides.service";

@ApiTags("cab")
@Controller("cab/rides")
export class RidesController {
  constructor(private rides: RidesService) {}

  // Public — like Uber, guests can see ride types and fare estimates before signing in;
  // login is only required to actually book (see `create` below).
  @Post("estimate")
  estimate(@Body() dto: EstimateRideDto) {
    return this.rides.estimate(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRideDto) {
    return this.rides.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  mine(@CurrentUser() user: AuthUser, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.rides.findMineList(user.id, Number(page), Number(pageSize));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.rides.findOneForUser(user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CancelRideDto) {
    return this.rides.cancel(user.id, id, dto.reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":id/review")
  review(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateRideReviewDto) {
    return this.rides.createReview(user.id, id, dto.rating, dto.comment);
  }
}
