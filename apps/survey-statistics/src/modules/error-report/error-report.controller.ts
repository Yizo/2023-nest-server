import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { Public } from "@/common/decorators/public.decorator";
import { PagePipe } from "@/common/pipes/page.pipe";
import { CreateMonitorBizSystemDto } from "./dto/create-monitor-biz-system.dto";
import { ListMonitorBizSystemDto } from "./dto/list-monitor-biz-system.dto";
import { ListMonitorLogsDto } from "./dto/list-monitor-logs.dto";
import { ReportMonitorPayloadDto } from "./dto/report-monitor-payload.dto";
import { UpdateMonitorBizSystemDto } from "./dto/update-monitor-biz-system.dto";
import { ErrorReportService } from "./error-report.service";
import { MonitorBizSystemService } from "./monitor-biz-system.service";
import { ReportBodyPipe } from "./report-body.pipe";

@Controller("error-report")
@ApiTags("error-report")
export class ErrorReportController {
	constructor(
		private readonly errorReportService: ErrorReportService,
		private readonly monitorBizSystemService: MonitorBizSystemService,
	) {}

	@Get("systems/enabled")
	@ApiBearerAuth()
	@ApiOperation({ summary: "已启用业务系统列表（下拉）" })
	listEnabledSystems() {
		return this.errorReportService.listEnabledSystems();
	}

	@Get("systems/list")
	@ApiBearerAuth()
	@ApiOperation({ summary: "业务系统分页列表（管理端）" })
	async listSystems(@Query(new PagePipe()) query: ListMonitorBizSystemDto) {
		const result = await this.monitorBizSystemService.findAll(query);
		return { ...result, page: query.page, pageSize: query.pageSize };
	}

	@Get("systems/:id")
	@ApiBearerAuth()
	@ApiOperation({ summary: "业务系统详情" })
	findSystem(@Param("id") id: string) {
		return this.monitorBizSystemService.findOne(Number(id));
	}

	@Post("systems/create")
	@ApiBearerAuth()
	@ApiOperation({ summary: "新增业务系统" })
	createSystem(@Body() dto: CreateMonitorBizSystemDto) {
		return this.monitorBizSystemService.create(dto);
	}

	@Post("systems/update")
	@ApiBearerAuth()
	@ApiOperation({ summary: "更新业务系统" })
	updateSystem(@Body() dto: UpdateMonitorBizSystemDto) {
		return this.monitorBizSystemService.update(dto);
	}

	@Post("systems/remove/:id")
	@ApiBearerAuth()
	@ApiOperation({ summary: "删除业务系统" })
	removeSystem(@Param("id") id: string) {
		return this.monitorBizSystemService.remove(Number(id));
	}

	@Get("logs")
	@ApiBearerAuth()
	@ApiOperation({ summary: "按业务系统 ID 分页查询监控日志（client_errors）" })
	@ApiQuery({ name: "systemId", required: true, description: "业务系统 ID" })
	@ApiQuery({ name: "page", required: false, description: "页码，默认 1" })
	@ApiQuery({ name: "pageSize", required: false, description: "每页条数，默认 10" })
	async listLogs(@Query(new PagePipe()) query: ListMonitorLogsDto) {
		const result = await this.errorReportService.listLogs(query);
		return {
			...result,
			systemId: query.systemId,
		};
	}

	@Post()
	@Public()
	@Throttle(20, 60)
	@ApiOperation({
		summary: "前端异常上报",
		description:
			"Body 为单条对象或对象数组，Content-Type 须为 application/json。" +
			"fetch: body: JSON.stringify(payload)；" +
			"sendBeacon: new Blob([JSON.stringify(payload)], { type: 'application/json' })",
	})
	@ApiBody({
		type: [ReportMonitorPayloadDto],
		description:
			"SDK MonitorPayload：单条或 `[{ type, message, timestamp, appId, stack?, url?, tags?, extra?, release?, context? }]`",
	})
	@ApiResponse({ status: 201, description: "上报成功" })
	report(
		@Body(ReportBodyPipe) dtos: ReportMonitorPayloadDto[],
		@Req() req: Request,
	) {
		return this.errorReportService.report(dtos, req);
	}
}
