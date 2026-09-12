import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { DeliveryPartnersService } from "./delivery-partners.service";
import { CreateDeliveryPartnerAccountDto, CreateDeliveryPartnerDto, UpdateDeliveryPartnerDto } from "./dto/delivery-partners.dto";

@ApiTags("admin-delivery")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_drivers")
@Controller("admin/delivery-partners")
export class AdminDeliveryPartnersController {
  constructor(private deliveryPartners: DeliveryPartnersService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "50",
  ) {
    return this.deliveryPartners.list({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post()
  create(@Body() dto: CreateDeliveryPartnerDto) {
    return this.deliveryPartners.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDeliveryPartnerDto) {
    return this.deliveryPartners.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.deliveryPartners.remove(id);
  }

  @Post(":id/account")
  createAccount(@Param("id") id: string, @Body() dto: CreateDeliveryPartnerAccountDto) {
    return this.deliveryPartners.createAccount(id, dto);
  }
}
