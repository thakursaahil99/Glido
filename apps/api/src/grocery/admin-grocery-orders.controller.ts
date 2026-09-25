import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { streamInvoicePdf } from "../common/invoice.util";
import { AssignGroceryDeliveryPartnerDto, UpdateGroceryOrderStatusDto } from "./dto/grocery-orders.dto";
import { GroceryOrdersService } from "./grocery-orders.service";

@ApiTags("admin-grocery-orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles("ADMIN")
@RequirePermissions("manage_grocery")
@Controller("admin/grocery/orders")
export class AdminGroceryOrdersController {
  constructor(private ordersService: GroceryOrdersService) {}

  @Get()
  adminList(
    @Query("status") status?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    return this.ordersService.adminList({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get(":id")
  adminDetail(@Param("id") id: string) {
    return this.ordersService.adminDetail(id);
  }

  @Get(":id/invoice.pdf")
  async downloadInvoice(@Param("id") id: string, @Res() res: Response) {
    const order = await this.ordersService.getForInvoice(id);
    streamInvoicePdf(res, {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      businessLine: "Glido Grocery",
      customerName: order.user?.name ?? "Customer",
      customerPhone: order.user?.phone,
      customerEmail: order.user?.email,
      addressLine: `${order.address?.line1 ?? ""}${order.address?.line2 ? `, ${order.address.line2}` : ""}`,
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        quantity: i.quantity,
        unitPrice: i.priceSnapshot,
        subtotal: i.subtotal,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      tipAmount: order.tipAmount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });
  }

  @Patch(":id/status")
  adminUpdateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateGroceryOrderStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.ordersService.adminUpdateStatus(id, dto.status, dto.note, actor.id);
  }

  @Patch(":id/assign-partner")
  assignDeliveryPartner(
    @Param("id") id: string,
    @Body() dto: AssignGroceryDeliveryPartnerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.ordersService.assignDeliveryPartner(id, dto.deliveryPartnerId, actor.id);
  }
}
