import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { GeocodeService } from "./geocode.service";

// Public (no login needed) — like Uber/Zomato, guests can search an address before signing in.
// Throttled tighter than the global default since we're proxying the free Nominatim API,
// which caps anonymous usage at ~1 req/sec under one shared User-Agent.
const GEOCODE_THROTTLE = { default: { ttl: 60_000, limit: 30 } };

@ApiTags("geocode")
@Throttle(GEOCODE_THROTTLE)
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
