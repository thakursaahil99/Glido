import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AuditLogModule } from "./audit/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { CabModule } from "./cab/cab.module";
import { PrismaThrottlerStorage } from "./common/throttler-storage.service";
import { ThrottlerStorageModule } from "./common/throttler-storage.module";
import { CitiesModule } from "./cities/cities.module";
import { CouponsModule } from "./coupons/coupons.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { GeocodeModule } from "./geocode/geocode.module";
import { GroceryModule } from "./grocery/grocery.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrdersModule } from "./orders/orders.module";
import { PartnerModule } from "./partner/partner.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RestaurantsModule } from "./restaurants/restaurants.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { SettingsModule } from "./settings/settings.module";
import { StaffModule } from "./staff/staff.module";
import { SupportModule } from "./support/support.module";
import { UploadsModule } from "./uploads/uploads.module";
import { UsersModule } from "./users/users.module";
import { WalletModule } from "./wallet/wallet.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 100 req/min per IP. Auth endpoints (login/register/OTP) override this
    // with a tighter limit via @Throttle(...) — see auth.controller.ts — to slow down
    // brute-force and OTP-spam attempts without needing a separate rate-limiting service.
    // Storage is Postgres-backed (PrismaThrottlerStorage), not the library's default
    // in-memory Map — that default is per-process and doesn't hold real limits across
    // Vercel's separate serverless instances.
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [PrismaThrottlerStorage],
      useFactory: (storage: PrismaThrottlerStorage) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        storage,
      }),
    }),
    PrismaModule,
    RealtimeModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    CitiesModule,
    RestaurantsModule,
    CouponsModule,
    PaymentsModule,
    OrdersModule,
    GroceryModule,
    CabModule,
    DeliveryModule,
    GeocodeModule,
    ReviewsModule,
    NotificationsModule,
    WalletModule,
    SettingsModule,
    PartnerModule,
    AdminModule,
    StaffModule,
    SupportModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
