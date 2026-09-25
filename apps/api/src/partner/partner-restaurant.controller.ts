import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdatePartnerRestaurantDto, UpsertMenuCategoryDto, UpsertMenuItemDto } from "../restaurants/dto/restaurants.dto";
import { RestaurantsService } from "../restaurants/restaurants.service";

@ApiTags("partner")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("RESTAURANT_OWNER")
@Controller("partner/restaurant")
export class PartnerRestaurantController {
  constructor(private restaurants: RestaurantsService) {}

  @Get()
  myRestaurant(@CurrentUser() user: AuthUser) {
    return this.restaurants.findByOwner(user.id);
  }

  @Get("stats")
  async myStats(@CurrentUser() user: AuthUser) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.getStats(restaurant.id);
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdatePartnerRestaurantDto) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.update(restaurant.id, dto);
  }

  // --- Menu categories ---
  @Post("categories")
  async createCategory(@CurrentUser() user: AuthUser, @Body() dto: UpsertMenuCategoryDto) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.createCategory(restaurant.id, dto);
  }

  @Patch("categories/:categoryId")
  async updateCategory(
    @CurrentUser() user: AuthUser,
    @Param("categoryId") categoryId: string,
    @Body() dto: UpsertMenuCategoryDto,
  ) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.updateCategory(restaurant.id, categoryId, dto);
  }

  @Delete("categories/:categoryId")
  async deleteCategory(@CurrentUser() user: AuthUser, @Param("categoryId") categoryId: string) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.deleteCategory(restaurant.id, categoryId);
  }

  // --- Menu items ---
  @Post("items")
  async createItem(@CurrentUser() user: AuthUser, @Body() dto: UpsertMenuItemDto) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.createItem(restaurant.id, dto);
  }

  @Patch("items/:itemId")
  async updateItem(@CurrentUser() user: AuthUser, @Param("itemId") itemId: string, @Body() dto: UpsertMenuItemDto) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.updateItem(restaurant.id, itemId, dto);
  }

  @Delete("items/:itemId")
  async deleteItem(@CurrentUser() user: AuthUser, @Param("itemId") itemId: string) {
    const restaurant = await this.restaurants.findByOwner(user.id);
    return this.restaurants.deleteItem(restaurant.id, itemId);
  }
}
