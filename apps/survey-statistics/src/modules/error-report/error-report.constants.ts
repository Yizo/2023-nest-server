import { MonitorContext } from "./dto/monitor-context";
import { MonitorEventType } from "./dto/monitor-event-type";

/** Bull 队列名称，对应 Redis 里的一条命名队列 */
export const CLIENT_ERROR_QUEUE = "client-error-report";

/**
 * 入队 / 出队任务结构（对齐 SDK MonitorPayload + 服务端补充字段）。
 */
export interface ClientErrorJobPayload {
	type: MonitorEventType;
	message: string;
	timestamp: number;
	url?: string;
	stack?: string;
	tags?: Record<string, string>;
	extra?: Record<string, unknown>;
	appId: string;
	release?: string;
	context?: MonitorContext;
	/** 服务端从请求头读取 */
	userAgent?: string;
	/** 服务端从 req.ip 读取 */
	ip?: string;
}
