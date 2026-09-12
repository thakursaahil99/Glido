import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { CitiesModule } from "../cities/cities.module";
import { CouponsModule } from "../coupons/coupons.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WalletModule } from "../wallet/wallet.module";
import { AdminDriversController } from "./admin-drivers.controller";
import { AdminRideTypesController } from "./admin-ride-types.controller";
import { AdminRidesController } from "./admin-rides.controller";
import { DriversService } from "./drivers.service";
import { RideTypesController } from "./ride-types.controller";
import { RideTypesService } from "./ride-types.service";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";

@Module({
  imports: [CouponsModule, RealtimeModule, AuditLogModule, CitiesModule, NotificationsModule, WalletModule],
  controllers: [
    RideTypesController,
    AdminRideTypesController,
    AdminDriversController,
    RidesController,
    AdminRidesController,
  ],
  providers: [RideTypesService, DriversService, RidesService],
})
export class CabModule {}
