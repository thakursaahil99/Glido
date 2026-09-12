import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RideTypesService } from "./ride-types.service";

@ApiTags("cab")
@Controller("cab/ride-types")
export class RideTypesController {
  constructor(private rideTypes: RideTypesService) {}

  @Get()
  list() {
    return this.rideTypes.listActive();
  }
}
