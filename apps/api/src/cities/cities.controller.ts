import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CitiesService } from "./cities.service";

class CityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  serviceRadiusKm?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags("cities")
@Controller()
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Get("cities")
  list() {
    return this.citiesService.list();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_settings")
  @Post("admin/cities")
  create(@Body() dto: CityDto) {
    return this.citiesService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_settings")
  @Patch("admin/cities/:id")
  update(@Param("id") id: string, @Body() dto: CityDto) {
    return this.citiesService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles("ADMIN")
  @RequirePermissions("manage_settings")
  @Delete("admin/cities/:id")
  remove(@Param("id") id: string) {
    return this.citiesService.remove(id);
  }
}
