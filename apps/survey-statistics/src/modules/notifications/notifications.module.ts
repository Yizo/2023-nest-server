import { Module } from "@nestjs/common";
import { RealtimePublisherModule } from "@/infrastructure/realtime/realtime-publisher.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [RealtimePublisherModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
