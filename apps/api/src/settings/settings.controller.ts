import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { UpdateSettingsDto } from "./dto/settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@Controller()
export class SettingsController {
  constructor(private settings: SettingsService) {}

  /** Public — checkout pages read tax/fee figures from here instead of hardcoding them. */
  @Get("settings")
  getPublic() {
    return this.settings.getAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_settings")
  @Patch("admin/settings")
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthUser) {
    return this.settings.update(dto, user.id);
  }
}
