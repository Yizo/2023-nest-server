import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { Request } from "express";
import { Repository } from "typeorm";
import { paginateBuilder } from "@base/commons";
import { ListMonitorLogsDto } from "./dto/list-monitor-logs.dto";
import { ReportMonitorPayloadDto } from "./dto/report-monitor-payload.dto";
import { CLIENT_ERROR_QUEUE, ClientErrorJobPayload } from "./error-report.constants";
import { ClientError } from "./entities/client-error.entity";
import { MonitorBizSystemService } from "./monitor-biz-system.service";

const MAX_STACK_LENGTH = 10 * 1024;
const MAX_USER_AGENT_LENGTH = 512;

@Injectable()
export class ErrorReportService {
	constructor(
		@InjectRepository(ClientError)
		private readonly clientErrorRepository: Repository<ClientError>,
		private readonly monitorBizSystemService: MonitorBizSystemService,
		/** 生产者：向 Redis 队列投递任务，不直接写库 */
		@InjectQueue(CLIENT_ERROR_QUEUE)
		private readonly clientErrorQueue: Queue<ClientErrorJobPayload>,
		private readonly logger: Logger,
	) {}

	/** 已启用业务系统列表（下拉等） */
	listEnabledSystems() {
		return this.monitorBizSystemService.listEnabled();
	}

	/** 按业务系统编号分页查询监控日志（表 client_errors，关联 systemId） */
	async listLogs(query: ListMonitorLogsDto) {
		const system = await this.monitorBizSystemService.findEnabledById(query.systemId);
		if (!system) {
			throw new NotFoundException(`业务系统不存在: ${query.systemId}`);
		}

		const qb = this.clientErrorRepository
			.createQueryBuilder("ce")
			.where("ce.systemId = :systemId", { systemId: system.id })
			.orderBy("ce.createdAt", "DESC");

		const { page, pageSize } = query;
		return paginateBuilder(qb, { page, pageSize });
	}

	/**
	 * 接收前端上报（生产者入口）。
	 *
	 * 消息队列在这里的作用：把「接收请求」和「写数据库」拆开。
	 * - 本方法只负责校验后的数据入队，然后立刻返回，HTTP 响应很快。
	 * - 真正的写库由 ErrorReportProcessor 在后台异步完成。
	 * - 即使 MySQL 暂时不可用，前端也不会因为写库失败而收到 500。
	 */
	async report(dtos: ReportMonitorPayloadDto[], req: Request) {
		const { ip, userAgent } = this.resolveRequestContext(req);

		for (const dto of dtos) {
			const payload = this.buildPayload(dto, ip, userAgent);

			try {
				// add = 往 Redis 队列里塞一条待处理任务（类似发快递，先接单再派送）
				await this.clientErrorQueue.add(payload, {
					attempts: 3, // 消费失败最多重试 3 次
					backoff: { type: "exponential", delay: 1000 }, // 重试间隔指数退避：1s、2s、4s…
					removeOnComplete: true, // 成功后删除任务，避免 Redis 堆积
				});
			} catch (error) {
				// 入队失败时把完整上报内容写入本地日志（logs/error/），作为 Redis 不可用时的兜底
				this.logToLocal("enqueue-fallback", payload, error);
			}
		}

		return { accepted: true, count: dtos.length };
	}

	/** 消费者调用：将队列任务持久化到 MySQL */
	async persist(payload: ClientErrorJobPayload) {
		const { timestamp, ...rest } = payload;
		const system = await this.monitorBizSystemService.findEnabledByAppId(rest.appId);
		const record = this.clientErrorRepository.create({
			...rest,
			systemId: system?.id,
			timestamp: String(timestamp),
		});
		await this.clientErrorRepository.save(record);
	}

	/** 写入 LoggerModule 本地日志文件，避免上报数据丢失 */
	logToLocal(reason: string, payload: ClientErrorJobPayload, error?: unknown) {
		this.logger.error(`[error-report:${reason}]`, {
			reason,
			error: error instanceof Error ? error.message : error,
			payload,
		});
	}

	private buildPayload(
		dto: ReportMonitorPayloadDto,
		ip: string | undefined,
		userAgent: string | undefined,
	): ClientErrorJobPayload {
		const stack =
			dto.stack && dto.stack.length > MAX_STACK_LENGTH
				? dto.stack.slice(0, MAX_STACK_LENGTH)
				: dto.stack;

		return {
			type: dto.type,
			message: dto.message,
			timestamp: dto.timestamp,
			url: dto.url,
			stack,
			tags: dto.tags,
			extra: dto.extra,
			appId: dto.appId,
			release: dto.release,
			context: dto.context,
			userAgent,
			ip,
		};
	}

	/** 从 HTTP 请求中读取 UA 和 IP，不由前端上报 */
	private resolveRequestContext(req: Request) {
		const rawUserAgent = req.headers["user-agent"];
		const userAgent =
			typeof rawUserAgent === "string"
				? rawUserAgent.slice(0, MAX_USER_AGENT_LENGTH)
				: undefined;

		return {
			ip: req.ip,
			userAgent,
		};
	}
}
