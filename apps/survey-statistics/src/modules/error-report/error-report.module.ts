import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CLIENT_ERROR_QUEUE } from "./error-report.constants";
import { ClientError } from "./entities/client-error.entity";
import { MonitorBizSystem } from "./entities/monitor-biz-system.entity";
import { ErrorReportController } from "./error-report.controller";
import { ErrorReportProcessor } from "./error-report.processor";
import { ErrorReportService } from "./error-report.service";
import { MonitorBizSystemService } from "./monitor-biz-system.service";
import { ReportBodyPipe } from "./report-body.pipe";

@Module({
	imports: [
		TypeOrmModule.forFeature([ClientError, MonitorBizSystem]),
		// 注册本模块使用的队列（连接已在 AppModule 的 BullModule.forRootAsync 中配置）
		BullModule.registerQueue({ name: CLIENT_ERROR_QUEUE }),
	],
	controllers: [ErrorReportController],
	// Service = 生产者；Processor = 消费者
	providers: [
		ErrorReportService,
		ErrorReportProcessor,
		MonitorBizSystemService,
		ReportBodyPipe,
	],
})
export class ErrorReportModule {}
