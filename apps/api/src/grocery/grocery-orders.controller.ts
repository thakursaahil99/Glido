import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CancelGroceryOrderDto, CreateGroceryOrderDto } from "./dto/grocery-orders.dto";
import { GroceryOrdersService } from "./grocery-orders.service";

@ApiTags("grocery-orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("grocery/orders")
export class GroceryOrdersController {
  constructor(private ordersService: GroceryOrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroceryOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get("me")
  mine(@CurrentUser() user: AuthUser, @Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return this.ordersService.findMineList(user.id, Number(page), Number(pageSize));
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.ordersService.findOneForUser(user.id, id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CancelGroceryOrderDto) {
    return this.ordersService.cancel(user.id, id, dto.reason);
  }
}
