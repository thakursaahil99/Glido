import { Body, Controller, ForbiddenException, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { DeliveryPartnersService } from "../delivery/delivery-partners.service";
import { UpdatePartnerProfileDto } from "../delivery/dto/delivery-partners.dto";
import { UpdateOrderStatusDto } from "../orders/dto/orders.dto";
import { OrdersService } from "../orders/orders.service";
import { UpdateGroceryOrderStatusDto } from "../grocery/dto/grocery-orders.dto";
import { GroceryOrdersService } from "../grocery/grocery-orders.service";

@ApiTags("partner")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("DELIVERY_PARTNER")
@Controller("delivery-partner/me")
export class PartnerDeliveryController {
  constructor(
    private deliveryPartners: DeliveryPartnersService,
    private orders: OrdersService,
    private groceryOrders: GroceryOrdersService,
  ) {}

  @Get()
  myProfile(@CurrentUser() user: AuthUser) {
    return this.deliveryPartners.findByUser(user.id);
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdatePartnerProfileDto) {
    const partner = await this.deliveryPartners.findByUser(user.id);
    return this.deliveryPartners.update(partner.id, dto);
  }

  /** Combined food + grocery orders currently assigned to this partner, tagged by kind. */
  @Get("orders")
  async myOrders(@CurrentUser() user: AuthUser) {
    const partner = await this.deliveryPartners.findByUser(user.id);
    const [foodOrders, groceryOrders] = await Promise.all([
      this.orders.findAssignedToPartner(partner.id),
      this.groceryOrders.findAssignedToPartner(partner.id),
    ]);
    return [
      ...foodOrders.map((o) => ({ ...o, kind: "food" as const })),
      ...groceryOrders.map((o) => ({ ...o, kind: "grocery" as const })),
    ];
  }

  @Patch("orders/food/:id/status")
  async updateFoodOrderStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    const partner = await this.deliveryPartners.findByUser(user.id);
    const order = await this.orders.adminDetail(id);
    if (order.deliveryPartnerId !== partner.id) throw new ForbiddenException("This order isn't assigned to you.");
    return this.orders.adminUpdateStatus(id, dto.status, dto.note, user.id);
  }

  @Patch("orders/grocery/:id/status")
  async updateGroceryOrderStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateGroceryOrderStatusDto) {
    const partner = await this.deliveryPartners.findByUser(user.id);
    const order = await this.groceryOrders.adminDetail(id);
    if (order.deliveryPartnerId !== partner.id) throw new ForbiddenException("This order isn't assigned to you.");
    return this.groceryOrders.adminUpdateStatus(id, dto.status, dto.note, user.id);
  }
}
