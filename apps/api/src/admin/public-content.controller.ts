import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { BannersService } from "./banners.service";

@ApiTags("content")
@Controller()
export class PublicContentController {
  constructor(private bannersService: BannersService) {}

  @Get("banners")
  listActive() {
    return this.bannersService.listActive();
  }
}
