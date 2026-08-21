import {
	IsBoolean,
	IsInt,
	IsISO8601,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	MaxLength,
	Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CursorQueryDto, PageQueryDto } from "@/common/pagination/pagination";

// 客户端上报 DTO 只校验输入格式，MonitoringService 还会校验 ingestKey。
export class CreateMonitorAppDto {
	@ApiProperty({ description: "监控应用编码，创建后用于 SDK 上报", example: "admin-web", minLength: 2, maxLength: 80 })
	@IsString({ message: "监控应用编码不能为空" })
	@Length(2, 80, { message: "监控应用编码长度必须在 2 到 80 个字符之间" })
	code!: string;

	@ApiProperty({ description: "监控应用名称", example: "管理后台", minLength: 1, maxLength: 120 })
	@IsString({ message: "监控应用名称不能为空" })
	@Length(1, 120, { message: "监控应用名称长度必须在 1 到 120 个字符之间" })
	name!: string;
}

export class UpdateMonitorAppDto {
	@ApiPropertyOptional({ description: "监控应用名称", minLength: 1, maxLength: 120 })
	@IsOptional()
	@IsString({ message: "监控应用名称必须是字符串" })
	@Length(1, 120, { message: "监控应用名称长度必须在 1 到 120 个字符之间" })
	name?: string;

	@ApiPropertyOptional({ description: "是否启用；关闭后拒绝该应用上报" })
	@IsOptional()
	@IsBoolean({ message: "监控应用启用状态必须是布尔值" })
	enabled?: boolean;
}

export class MonitorAppListQueryDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "按应用名称筛选", maxLength: 120 })
	@IsOptional()
	@IsString({ message: "监控应用名称必须是字符串" })
	@MaxLength(120, { message: "监控应用名称不能超过 120 个字符" })
	name?: string;

	@ApiPropertyOptional({ description: "按应用编码筛选", maxLength: 80 })
	@IsOptional()
	@IsString({ message: "监控应用编码必须是字符串" })
	@MaxLength(80, { message: "监控应用编码不能超过 80 个字符" })
	code?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@Transform(({ value }) => value === "true" ? true : value === "false" ? false : value)
	@IsBoolean({ message: "监控应用启用状态必须是布尔值" })
	enabled?: boolean;
}

export class ReportClientErrorDto {
	@ApiProperty({ description: "监控应用编码", example: "admin-web", minLength: 2, maxLength: 80 })
	@IsString({ message: "监控应用编码不能为空" })
	@Length(2, 80, { message: "监控应用编码长度必须在 2 到 80 个字符之间" })
	appCode!: string;

	@ApiProperty({ description: "该应用的上报密钥 ingestKey", minLength: 20, maxLength: 200 })
	@IsString({ message: "上报密钥不能为空" })
	@Length(20, 200, { message: "上报密钥长度必须在 20 到 200 个字符之间" })
	ingestKey!: string;

	@ApiProperty({ description: "客户端生成的错误事件 ID，用于去重", minLength: 1, maxLength: 100 })
	@IsString({ message: "错误事件 ID 不能为空" })
	@Length(1, 100, { message: "错误事件 ID 长度必须在 1 到 100 个字符之间" })
	eventId!: string;

	@ApiProperty({ description: "错误消息", minLength: 1, maxLength: 5000 })
	@IsString({ message: "错误消息不能为空" })
	@Length(1, 5_000, { message: "错误消息长度必须在 1 到 5000 个字符之间" })
	message!: string;

	@ApiPropertyOptional({ description: "错误堆栈", maxLength: 30000 })
	@IsOptional()
	@IsString({ message: "错误堆栈必须是字符串" })
	@MaxLength(30_000, { message: "错误堆栈不能超过 30000 个字符" })
	stack?: string;

	@ApiProperty({ description: "错误发生时间，ISO 8601", example: "2026-08-18T07:00:00.000Z" })
	@IsISO8601({}, { message: "错误发生时间必须是 ISO 8601 时间格式" })
	occurredAt!: string;

	@ApiPropertyOptional({ description: "额外上下文，任意 JSON 对象", type: "object", additionalProperties: true })
	@IsOptional()
	@IsObject({ message: "错误上下文必须是对象" })
	context: Record<string, unknown> = {};
}

export class ClientErrorListQueryDto extends CursorQueryDto {
	@ApiProperty({ description: "监控应用 ID（UUIDv7）" })
	@IsUUID("7", { message: "监控应用 ID 格式不正确" })
	appId!: string;

	@ApiPropertyOptional({ description: "错误指纹，固定 64 位，用于查看同一组错误", minLength: 64, maxLength: 64 })
	@IsOptional()
	@IsString({ message: "错误指纹必须是字符串" })
	@Length(64, 64, { message: "错误指纹必须是 64 个字符" })
	fingerprint?: string;
}

/** 前端监控 SDK 的公开上报格式。 */
export class SdkErrorReportDto {
	@ApiProperty({ description: "错误类型，例如 js-error、unhandledrejection", example: "js-error", minLength: 1, maxLength: 80 })
	@IsString({ message: "错误类型不能为空" })
	@Length(1, 80, { message: "错误类型长度必须在 1 到 80 个字符之间" })
	type!: string;

	@ApiProperty({ description: "错误消息", minLength: 1, maxLength: 5000 })
	@IsString({ message: "错误消息不能为空" })
	@Length(1, 5_000, { message: "错误消息长度必须在 1 到 5000 个字符之间" })
	message!: string;

	@ApiProperty({ description: "错误发生时间，毫秒时间戳", example: 1_724_000_000_000 })
	@IsInt({ message: "错误发生时间必须是毫秒时间戳" })
	@Min(0, { message: "错误发生时间不能小于 0" })
	timestamp!: number;

	@ApiProperty({ description: "监控应用编码", example: "admin-web", minLength: 2, maxLength: 80 })
	@IsString({ message: "监控应用编码不能为空" })
	@Length(2, 80, { message: "监控应用编码长度必须在 2 到 80 个字符之间" })
	appId!: string;

	@ApiProperty({ description: "该应用的上报密钥 ingestKey", minLength: 20, maxLength: 200 })
	@IsString({ message: "上报密钥不能为空" })
	@Length(20, 200, { message: "上报密钥长度必须在 20 到 200 个字符之间" })
	ingestKey!: string;

	@ApiPropertyOptional({ description: "错误堆栈", maxLength: 30000 })
	@IsOptional()
	@IsString({ message: "错误堆栈必须是字符串" })
	@MaxLength(30_000, { message: "错误堆栈不能超过 30000 个字符" })
	stack?: string;

	@ApiPropertyOptional({ description: "出错时的页面地址", maxLength: 2000 })
	@IsOptional()
	@IsString({ message: "页面地址必须是字符串" })
	@MaxLength(2_000, { message: "页面地址不能超过 2000 个字符" })
	url?: string;

	@ApiPropertyOptional({ description: "前端发布版本", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "发布版本必须是字符串" })
	@MaxLength(100, { message: "发布版本不能超过 100 个字符" })
	release?: string;

	@ApiPropertyOptional({ description: "错误标签", type: "object", additionalProperties: true })
	@IsOptional()
	@IsObject({ message: "错误标签必须是对象" })
	tags?: Record<string, unknown>;

	@ApiPropertyOptional({ description: "错误附加信息", type: "object", additionalProperties: true })
	@IsOptional()
	@IsObject({ message: "错误附加信息必须是对象" })
	extra?: Record<string, unknown>;

	@ApiPropertyOptional({ description: "错误上下文", type: "object", additionalProperties: true })
	@IsOptional()
	@IsObject({ message: "错误上下文必须是对象" })
	context?: Record<string, unknown>;
}
