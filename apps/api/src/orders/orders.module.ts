import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { CouponsModule } from "../coupons/coupons.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SettingsModule } from "../settings/settings.module";
import { WalletModule } from "../wallet/wallet.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [
    CouponsModule,
    PaymentsModule,
    RealtimeModule,
    AuditLogModule,
    NotificationsModule,
    WalletModule,
    SettingsModule,
    DeliveryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
