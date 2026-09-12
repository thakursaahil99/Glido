import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpsertCouponDto, ValidateCouponDto } from "./dto/coupons.dto";
import { CouponsService } from "./coupons.service";

@ApiTags("coupons")
@Controller()
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("coupons/validate")
  async validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateCouponDto) {
    const result = await this.couponsService.computeDiscount({
      code: dto.code,
      userId: user.id,
      restaurantId: dto.restaurantId,
      subtotal: dto.subtotal,
    });
    return { valid: true, discount: result.discount, couponId: result.coupon.id };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_coupons")
  @Get("admin/coupons")
  list() {
    return this.couponsService.list();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_coupons")
  @Post("admin/coupons")
  create(@Body() dto: UpsertCouponDto) {
    return this.couponsService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_coupons")
  @Patch("admin/coupons/:id")
  update(@Param("id") id: string, @Body() dto: UpsertCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_coupons")
  @Delete("admin/coupons/:id")
  remove(@Param("id") id: string) {
    return this.couponsService.remove(id);
  }
}
