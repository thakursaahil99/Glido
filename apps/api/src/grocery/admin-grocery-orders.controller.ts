import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateGroceryOrderStatusDto } from "./dto/grocery-orders.dto";
import { GroceryOrdersService } from "./grocery-orders.service";

@ApiTags("admin-grocery-orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_grocery")
@Controller("admin/grocery/orders")
export class AdminGroceryOrdersController {
  constructor(private ordersService: GroceryOrdersService) {}

  @Get()
  adminList(
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.ordersService.adminList({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(":id")
  adminDetail(@Param("id") id: string) {
    return this.ordersService.adminDetail(id);
  }

  @Patch(":id/status")
  adminUpdateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateGroceryOrderStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.ordersService.adminUpdateStatus(id, dto.status, dto.note, actor.id);
  }
}
