import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  CreateRestaurantOwnerDto,
  UpdateRestaurantStatusDto,
  UpsertMenuCategoryDto,
  UpsertMenuItemDto,
  UpsertRestaurantDto,
} from "./dto/restaurants.dto";
import { RestaurantsService } from "./restaurants.service";

@ApiTags("admin-restaurants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_restaurants")
@Controller("admin/restaurants")
export class AdminRestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  @Get()
  adminList(
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.restaurantsService.adminList({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(":id")
  adminDetail(@Param("id") id: string) {
    return this.restaurantsService.adminDetail(id);
  }

  @Post()
  create(@Body() dto: UpsertRestaurantDto) {
    return this.restaurantsService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpsertRestaurantDto) {
    return this.restaurantsService.update(id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateRestaurantStatusDto,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.restaurantsService.updateStatus(id, dto.status, actor.id, req.ip);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.restaurantsService.remove(id);
  }

  @Post(":id/owner")
  createOwnerAccount(@Param("id") id: string, @Body() dto: CreateRestaurantOwnerDto) {
    return this.restaurantsService.createOwnerAccount(id, dto);
  }

  // --- Menu categories ---
  @Post(":id/categories")
  createCategory(@Param("id") id: string, @Body() dto: UpsertMenuCategoryDto) {
    return this.restaurantsService.createCategory(id, dto);
  }

  @Patch(":id/categories/:categoryId")
  updateCategory(
    @Param("id") id: string,
    @Param("categoryId") categoryId: string,
    @Body() dto: UpsertMenuCategoryDto,
  ) {
    return this.restaurantsService.updateCategory(id, categoryId, dto);
  }

  @Delete(":id/categories/:categoryId")
  deleteCategory(@Param("id") id: string, @Param("categoryId") categoryId: string) {
    return this.restaurantsService.deleteCategory(id, categoryId);
  }

  // --- Menu items ---
  @Post(":id/items")
  createItem(@Param("id") id: string, @Body() dto: UpsertMenuItemDto) {
    return this.restaurantsService.createItem(id, dto);
  }

  @Patch(":id/items/:itemId")
  updateItem(@Param("id") id: string, @Param("itemId") itemId: string, @Body() dto: UpsertMenuItemDto) {
    return this.restaurantsService.updateItem(id, itemId, dto);
  }

  @Delete(":id/items/:itemId")
  deleteItem(@Param("id") id: string, @Param("itemId") itemId: string) {
    return this.restaurantsService.deleteItem(id, itemId);
  }
}
