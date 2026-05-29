import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	MaxLength,
} from "class-validator";
import { MonitorContext } from "./monitor-context";
import { MONITOR_EVENT_TYPES, MonitorEventType } from "./monitor-event-type";

/**
 * 与前端 SDK transport 载荷 MonitorPayload 对齐。
 * userAgent、ip 由服务端从请求头读取，不入参。
 */
export class ReportMonitorPayloadDto {
	@ApiProperty({
		description: "错误来源类型",
		enum: MONITOR_EVENT_TYPES,
	})
	@IsIn(MONITOR_EVENT_TYPES)
	type!: MonitorEventType;

	@ApiProperty({ description: "由 error.message 解析" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(2000)
	message!: string;

	@ApiProperty({ description: "事件发生时间戳（毫秒），SDK normalize 阶段补齐" })
	@Type(() => Number)
	@IsInt()
	timestamp!: number;

	@ApiPropertyOptional({ description: "页面或请求 URL，SDK 自动补齐" })
	@IsOptional()
	@IsString()
	@MaxLength(2048)
	url?: string;

	@ApiPropertyOptional({
		description: "由 error.stack 解析（去掉首行 Name: message）；无 stack 时不传",
	})
	@IsOptional()
	@IsString()
	@MaxLength(10000)
	stack?: string;

	@ApiPropertyOptional({ description: "用于筛选、聚合的低基数字段" })
	@IsOptional()
	@IsObject()
	tags?: Record<string, string>;

	@ApiPropertyOptional({ description: "用于排查问题的补充数据（如 request-error 的请求详情）" })
	@IsOptional()
	@IsObject()
	extra?: Record<string, unknown>;

	@ApiProperty({ description: "应用标识" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(128)
	appId!: string;

	@ApiPropertyOptional({ description: "发布版本" })
	@IsOptional()
	@IsString()
	@MaxLength(128)
	release?: string;

	@ApiPropertyOptional({ description: "业务上下文" })
	@IsOptional()
	@IsObject()
	context?: MonitorContext;
}
