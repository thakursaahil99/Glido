import { Module } from "@nestjs/common";
import { AdminDeliveryPartnersController } from "./admin-delivery-partners.controller";
import { DeliveryPartnersService } from "./delivery-partners.service";

@Module({
  controllers: [AdminDeliveryPartnersController],
  providers: [DeliveryPartnersService],
  exports: [DeliveryPartnersService],
})
export class DeliveryModule {}
