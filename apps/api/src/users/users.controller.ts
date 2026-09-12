import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RedeemLoyaltyPointsDto, UpdateMeDto, UpdateUserStatusDto, UpsertAddressDto } from "./dto/users.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("users/me")
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.me(user.id);
  }

  @Patch("users/me")
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Get("users/me/addresses")
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.usersService.listAddresses(user.id);
  }

  @Post("users/me/addresses")
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: UpsertAddressDto) {
    return this.usersService.addAddress(user.id, dto);
  }

  @Patch("users/me/addresses/:id")
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpsertAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete("users/me/addresses/:id")
  deleteAddress(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Get("users/me/referral")
  referralSummary(@CurrentUser() user: AuthUser) {
    return this.usersService.referralSummary(user.id);
  }

  @Post("users/me/loyalty/redeem")
  redeemLoyaltyPoints(@CurrentUser() user: AuthUser, @Body() dto: RedeemLoyaltyPointsDto) {
    return this.usersService.redeemLoyaltyPoints(user.id, dto);
  }

  // --- Admin ---
  @Get("admin/users")
  @Roles("ADMIN")
  @RequirePermissions("manage_users")
  adminList(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.usersService.adminList({
      search,
      status,
      role,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Patch("admin/users/:id/status")
  @Roles("ADMIN")
  @RequirePermissions("manage_users")
  adminUpdateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.adminUpdateStatus(id, dto, actor.id);
  }
}
