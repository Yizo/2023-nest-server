import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@/common/decorators";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import { CreateSurveyDto, SubmitSurveyDto, SurveyListQueryDto, UpdateSurveyDto } from "./survey.dto";
import { SurveyQueries } from "./survey.queries";
import { SurveyService } from "./survey.service";

/** 问卷 Controller 只做路由、DTO 和权限声明，不直接拼接 SQL。 */
@ApiTags("问卷")
@ApiBearerAuth("bearer")
@Controller("surveys")
export class SurveyController {
  constructor(private readonly service: SurveyService, private readonly queries: SurveyQueries) {}

  @Get()
  @RequirePermissions("survey.read")
  @ApiOperation({ summary: "问卷列表" })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: SurveyListQueryDto) {
    return this.queries.list(user, query);
  }

  @Get(":id")
  @RequirePermissions("survey.read")
  @ApiParam({ name: "id", description: "问卷 ID（UUIDv7）" })
  @ApiOperation({ summary: "问卷详情" })
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.detail(user, id);
  }

  @Post()
  @RequirePermissions("survey.create")
  @ApiOperation({ summary: "创建问卷" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateSurveyDto) {
    return this.service.create(user, body);
  }

  @Post(":id/update")
  @RequirePermissions("survey.update")
  @ApiParam({ name: "id", description: "问卷 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新问卷" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: UpdateSurveyDto) {
    return this.service.update(user, id, body);
  }

  @Post(":id/publish")
  @RequirePermissions("survey.publish")
  @ApiParam({ name: "id", description: "问卷 ID（UUIDv7）" })
  @ApiOperation({ summary: "发布问卷", description: "发布后才允许提交答卷。" })
  publish(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.publish(user, id);
  }

  @Post(":id/close")
  @RequirePermissions("survey.close")
  @ApiParam({ name: "id", description: "问卷 ID（UUIDv7）" })
  @ApiOperation({ summary: "关闭问卷", description: "关闭后不再接受新答卷。" })
  close(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.close(user, id);
  }

  @Post(":id/responses")
  @RequirePermissions("survey.respond")
  @ApiParam({ name: "id", description: "问卷 ID（UUIDv7）" })
  @ApiOperation({ summary: "提交答卷" })
  submit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: SubmitSurveyDto) {
    return this.service.submit(user, id, body);
  }

  @Get(":id/statistics")
  @RequirePermissions("survey.statistics")
  @ApiParam({ name: "id", description: "问卷 ID（UUIDv7）" })
  @ApiOperation({ summary: "问卷统计" })
  async statistics(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.service.assertStatisticsAccess(user, id);
    return this.queries.statistics(id);
  }
}
