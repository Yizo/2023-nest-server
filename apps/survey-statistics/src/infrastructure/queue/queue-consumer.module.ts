import { Module } from "@nestjs/common";
import { DatabaseOperationsModule } from "@/database/database-operations.module";
import { MonitoringModule } from "@/modules/monitoring/monitoring.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { BackgroundProcessor } from "./background.processor";

@Module({
  // Consumer 只在 all/worker 进程加载；api 进程不会启动 BullMQ Worker。
  imports: [DatabaseOperationsModule, MonitoringModule, NotificationsModule],
  providers: [BackgroundProcessor],
})
export class QueueConsumerModule {}
