import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
