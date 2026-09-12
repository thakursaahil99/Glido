import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpsertGroceryCategoryDto, UpsertGroceryProductDto } from "./dto/grocery-catalog.dto";
import { GroceryCatalogService } from "./grocery-catalog.service";

@ApiTags("admin-grocery")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_grocery")
@Controller("admin/grocery")
export class AdminGroceryCatalogController {
  constructor(private catalog: GroceryCatalogService) {}

  // --- Categories ---
  @Get("categories")
  listCategories() {
    return this.catalog.listAllCategories();
  }

  @Post("categories")
  createCategory(@Body() dto: UpsertGroceryCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @Patch("categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpsertGroceryCategoryDto) {
    return this.catalog.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  removeCategory(@Param("id") id: string) {
    return this.catalog.removeCategory(id);
  }

  // --- Products ---
  @Get("products")
  listProducts(
    @Query("categoryId") categoryId?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "50",
  ) {
    return this.catalog.adminListProducts({ categoryId, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post("products")
  createProduct(@Body() dto: UpsertGroceryProductDto) {
    return this.catalog.createProduct(dto);
  }

  @Patch("products/:id")
  updateProduct(@Param("id") id: string, @Body() dto: UpsertGroceryProductDto) {
    return this.catalog.updateProduct(id, dto);
  }

  @Delete("products/:id")
  removeProduct(@Param("id") id: string) {
    return this.catalog.removeProduct(id);
  }
}
