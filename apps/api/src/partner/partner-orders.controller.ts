import { Body, Controller, ForbiddenException, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateOrderStatusDto } from "../orders/dto/orders.dto";
import { OrdersService } from "../orders/orders.service";
import { RestaurantsService } from "../restaurants/restaurants.service";

@ApiTags("partner")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("RESTAURANT_OWNER")
@Controller("partner/orders")
export class PartnerOrdersController {
  constructor(
    private orders: OrdersService,
    private restaurants: RestaurantsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.orders.adminList({
      restaurantId: restaurant.id,
      status,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(":id")
  async detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    const order = await this.orders.adminDetail(id);
    if (order.restaurantId !== restaurant.id) throw new ForbiddenException("This order isn't yours to view.");
    return order;
  }

  @Patch(":id/status")
  async updateStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    const order = await this.orders.adminDetail(id);
    if (order.restaurantId !== restaurant.id) throw new ForbiddenException("This order isn't yours to update.");
    return this.orders.adminUpdateStatus(id, dto.status, dto.note, user.id);
  }
}
