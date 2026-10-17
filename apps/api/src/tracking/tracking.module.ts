import { Module } from "@nestjs/common";
import { GeocodeModule } from "../geocode/geocode.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";

@Module({
  imports: [RealtimeModule, GeocodeModule],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}
