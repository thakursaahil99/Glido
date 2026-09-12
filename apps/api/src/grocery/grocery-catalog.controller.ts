import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { GroceryCatalogService } from "./grocery-catalog.service";

@ApiTags("grocery")
@Controller("grocery")
export class GroceryCatalogController {
  constructor(private catalog: GroceryCatalogService) {}

  @Get("categories")
  listCategories() {
    return this.catalog.listActiveCategories();
  }

  @Get("products")
  listProducts(
    @Query("categoryId") categoryId?: string,
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "40",
  ) {
    return this.catalog.listProducts({ categoryId, search, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get("products/:id")
  productDetail(@Param("id") id: string) {
    return this.catalog.productDetail(id);
  }
}
