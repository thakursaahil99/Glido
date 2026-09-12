import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { AdminRestaurantsController } from "./admin-restaurants.controller";
import { RestaurantsController } from "./restaurants.controller";
import { RestaurantsService } from "./restaurants.service";

@Module({
  imports: [AuditLogModule],
  controllers: [RestaurantsController, AdminRestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
