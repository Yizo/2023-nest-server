import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "@/common/decorators";
import { SdkErrorReportDto } from "./monitoring.dto";
import { MonitoringService } from "./monitoring.service";
import { SdkErrorReportPipe } from "./sdk-error-report.pipe";

/** 前端监控 SDK 的稳定接入接口，兼容单条对象和批量数组。 */
@ApiTags("监控 SDK")
@Controller("error-report")
export class SdkErrorReportController {
	constructor(private readonly service: MonitoringService) {}

	@Public()
	@Post()
	@HttpCode(202)
	@ApiOperation({
		summary: "SDK 错误上报",
		description: "公开接口。请求体可以是单条错误对象，也可以是错误对象数组。成功返回 202。",
	})
	@ApiBody({ type: SdkErrorReportDto, isArray: true })
	report(
		@Body(SdkErrorReportPipe) body: SdkErrorReportDto[],
		@Req() request: Request & { requestId?: string },
	) {
		return this.service.reportSdkBatch(body, request.requestId);
	}
}
