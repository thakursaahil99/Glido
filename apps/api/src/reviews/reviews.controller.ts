import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateReviewDto } from "../orders/dto/orders.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller()
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("orders/:id/review")
  create(@CurrentUser() user: AuthUser, @Param("id") orderId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createForOrder(user.id, orderId, dto.rating, dto.comment);
  }

  @Get("restaurants/:id/reviews")
  list(
    @Param("id") restaurantId: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.reviewsService.listForRestaurant(restaurantId, Number(page), Number(pageSize));
  }
}
