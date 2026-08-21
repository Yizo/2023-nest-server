import { Module } from "@nestjs/common";
import { QueueProducerModule } from "@/infrastructure/queue/queue-producer.module";
import { AppLoggerModule } from "@/common/logger";

@Module({ imports: [AppLoggerModule, QueueProducerModule] })
export class ToolModule {}
