import { Module } from "@nestjs/common";
import { DeliveryModule } from "../delivery/delivery.module";
import { GroceryModule } from "../grocery/grocery.module";
import { OrdersModule } from "../orders/orders.module";
import { RestaurantsModule } from "../restaurants/restaurants.module";
import { PartnerDeliveryController } from "./partner-delivery.controller";
import { PartnerOrdersController } from "./partner-orders.controller";
import { PartnerRestaurantController } from "./partner-restaurant.controller";

@Module({
  imports: [RestaurantsModule, OrdersModule, GroceryModule, DeliveryModule],
  controllers: [PartnerRestaurantController, PartnerOrdersController, PartnerDeliveryController],
})
export class PartnerModule {}
