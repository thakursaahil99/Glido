import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { GeocodeService } from "./geocode.service";

@ApiTags("geocode")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("geocode")
export class GeocodeController {
  constructor(private geocode: GeocodeService) {}

  @Get("reverse")
  reverse(@Query("lat") lat: string, @Query("lng") lng: string) {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) throw new BadRequestException("Invalid coordinates.");
    return this.geocode.reverse(latN, lngN);
  }

  @Get("search")
  search(@Query("q") q: string) {
    if (!q || q.trim().length < 3) throw new BadRequestException("Enter at least 3 characters to search.");
    return this.geocode.search(q.trim());
  }
}
