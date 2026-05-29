import { OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import {
	CLIENT_ERROR_QUEUE,
	ClientErrorJobPayload,
} from "./error-report.constants";
import { ErrorReportService } from "./error-report.service";

/**
 * 消费者（Worker）。
 *
 * Bull 会在后台监听 Redis 队列 `CLIENT_ERROR_QUEUE`：
 * - Service.report() 入队后，本类的 handle 会被自动触发。
 * - handle 只负责调用 persist 写库；抛错时 Bull 按 job 配置自动重试。
 * - 与 HTTP 请求生命周期无关，可在 DB 慢或短暂故障时削峰、重试。
 */
@Processor(CLIENT_ERROR_QUEUE)
export class ErrorReportProcessor {
	constructor(private readonly errorReportService: ErrorReportService) {}

	/** 处理队列中的一条任务；job.data 即入队时的 ClientErrorJobPayload */
	@Process()
	async handle(job: Job<ClientErrorJobPayload>) {
		await this.errorReportService.persist(job.data);
	}

	/** 重试耗尽仍失败时，将上报内容写入本地日志兜底 */
	@OnQueueFailed()
	onFailed(job: Job<ClientErrorJobPayload>, error: Error) {
		this.errorReportService.logToLocal("persist-fallback", job.data, error);
	}
}
