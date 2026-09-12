import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { CouponsModule } from "../coupons/coupons.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SettingsModule } from "../settings/settings.module";
import { WalletModule } from "../wallet/wallet.module";
import { AdminGroceryCatalogController } from "./admin-grocery-catalog.controller";
import { AdminGroceryOrdersController } from "./admin-grocery-orders.controller";
import { GroceryCatalogController } from "./grocery-catalog.controller";
import { GroceryCatalogService } from "./grocery-catalog.service";
import { GroceryOrdersController } from "./grocery-orders.controller";
import { GroceryOrdersService } from "./grocery-orders.service";

@Module({
  imports: [
    CouponsModule,
    RealtimeModule,
    AuditLogModule,
    NotificationsModule,
    WalletModule,
    SettingsModule,
    DeliveryModule,
  ],
  controllers: [
    GroceryCatalogController,
    AdminGroceryCatalogController,
    GroceryOrdersController,
    AdminGroceryOrdersController,
  ],
  providers: [GroceryCatalogService, GroceryOrdersService],
  exports: [GroceryOrdersService],
})
export class GroceryModule {}
