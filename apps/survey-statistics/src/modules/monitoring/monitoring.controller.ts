import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public, RequirePermissions } from "@/common/decorators";
import { ClientErrorListQueryDto, CreateMonitorAppDto, MonitorAppListQueryDto, ReportClientErrorDto, UpdateMonitorAppDto } from "./monitoring.dto";
import { MonitoringQueries } from "./monitoring.queries";
import { MonitoringService } from "./monitoring.service";

/** 路径参数 UUID 校验也使用中文提示，避免绕过 DTO 后返回英文。 */
const uuidV7Pipe = new ParseUUIDPipe({
  version: "7",
  exceptionFactory: () => new BadRequestException("ID 格式不正确"),
});

/** 监控同时提供受保护的管理查询和公开的客户端错误上报入口。 */
@ApiTags("监控")
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly service: MonitoringService, private readonly queries: MonitoringQueries) {}

  @Get("apps")
  @RequirePermissions("monitor.read")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "监控应用列表" })
  apps(@Query() query: MonitorAppListQueryDto) {
    return this.service.listApps(query);
  }

  @Post("apps")
  @RequirePermissions("monitor.manage")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "创建监控应用", description: "创建后会生成 ingestKey，供前端 SDK 上报使用。" })
  createApp(@Body() body: CreateMonitorAppDto) {
    return this.service.createApp(body);
  }

  @Post("apps/:id/update")
  @RequirePermissions("monitor.manage")
  @ApiBearerAuth("bearer")
  @ApiParam({ name: "id", description: "监控应用 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新监控应用" })
  updateApp(@Param("id", uuidV7Pipe) id: string, @Body() body: UpdateMonitorAppDto) {
    return this.service.updateApp(id, body);
  }

  @Public()
  @Post("client-errors")
  @HttpCode(202)
  @ApiOperation({ summary: "上报客户端错误", description: "公开接口，需携带应用编码和 ingestKey。成功返回 202。" })
  report(@Body() body: ReportClientErrorDto, @Req() request: Request & { requestId?: string }) {
    return this.service.report(body, request.requestId);
  }

  @Get("client-errors")
  @RequirePermissions("monitor.read")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "客户端错误列表" })
  errors(@Query() query: ClientErrorListQueryDto) {
    return this.queries.listErrors(query);
  }

  @Get("error-groups/:appId")
  @RequirePermissions("monitor.read")
  @ApiBearerAuth("bearer")
  @ApiParam({ name: "appId", description: "监控应用 ID（UUIDv7）" })
  @ApiOperation({ summary: "错误分组", description: "按指纹聚合同一类错误。" })
  groups(@Param("appId", uuidV7Pipe) appId: string) {
    return this.queries.listGroups(appId);
  }
}
