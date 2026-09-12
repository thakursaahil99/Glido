import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CancelOrderDto, CreateOrderDto, UpdateOrderStatusDto } from "./dto/orders.dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post("orders")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get("orders/me")
  mine(
    @CurrentUser() user: AuthUser,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.ordersService.findMineList(user.id, Number(page), Number(pageSize));
  }

  @Get("orders/:id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.ordersService.findOneForUser(user.id, id);
  }

  @Post("orders/:id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancel(user.id, id, dto.reason);
  }

  @Post("orders/:id/reorder")
  reorder(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.ordersService.reorderItems(user.id, id);
  }

  // --- Admin ---
  @Get("admin/orders")
  @Roles("ADMIN")
  @RequirePermissions("manage_orders")
  adminList(
    @Query("status") status?: string,
    @Query("restaurantId") restaurantId?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.ordersService.adminList({
      status,
      restaurantId,
      paymentStatus,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get("admin/orders/:id")
  @Roles("ADMIN")
  @RequirePermissions("manage_orders")
  adminDetail(@Param("id") id: string) {
    return this.ordersService.adminDetail(id);
  }

  @Patch("admin/orders/:id/status")
  @Roles("ADMIN")
  @RequirePermissions("manage_orders")
  adminUpdateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.ordersService.adminUpdateStatus(id, dto.status, dto.note, actor.id);
  }
}
