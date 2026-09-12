import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RestaurantsService } from "./restaurants.service";

@ApiTags("restaurants")
@Controller()
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  @Get("restaurants")
  list(
    @Query("cityId") cityId?: string,
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.restaurantsService.list({ cityId, search, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get("restaurants/:id")
  detail(@Param("id") id: string) {
    return this.restaurantsService.detail(id);
  }
}
