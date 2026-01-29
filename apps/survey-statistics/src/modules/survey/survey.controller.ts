import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiCreatedResponse,
	ApiOperation,
	ApiOkResponse,
	ApiParam,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt/jwt.guard";
import { ReqUser } from "@/common/decorators/req-user.decorator";
import { SurveyService } from "./survey.service";
import { CreateSurveyDto } from "./dto/create-survey.dto";
import { UpdateSurveyDto } from "./dto/update-survey.dto";
import { SubmitSurveyResponseDto } from "./dto/submit-response.dto";

@Controller("surveys")
@ApiTags("surveys")
@ApiBearerAuth()
export class SurveyController {
	constructor(private readonly surveyService: SurveyService) {}

	@Post()
	@ApiOperation({ summary: "创建问卷" })
	@ApiBody({ type: CreateSurveyDto })
	@ApiCreatedResponse({ description: "问卷创建成功" })
	create(@ReqUser() user: any, @Body() dto: CreateSurveyDto) {
		return this.surveyService.create(user.userId, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Patch(":id")
	@ApiOperation({ summary: "更新问卷" })
	@ApiParam({ name: "id", description: "问卷 ID" })
	@ApiBody({ type: UpdateSurveyDto })
	update(@ReqUser() user: any, @Param("id") id: string, @Body() dto: UpdateSurveyDto) {
		return this.surveyService.update(id, user.userId, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Delete(":id")
	@ApiOperation({ summary: "删除问卷" })
	@ApiParam({ name: "id", description: "问卷 ID" })
	remove(@ReqUser() user: any, @Param("id") id: string) {
		return this.surveyService.remove(id, user.userId);
	}

	@Get()
	@ApiOperation({ summary: "分页查询问卷" })
	@ApiQuery({ name: "limit", required: false, description: "每页数量，默认 20" })
	@ApiQuery({ name: "offset", required: false, description: "偏移量，默认 0" })
	list(@Query("limit") limit = 20, @Query("offset") offset = 0) {
		return this.surveyService.findAll(Number(limit), Number(offset));
	}

	@Get(":id")
	@ApiOperation({ summary: "查询问卷详情" })
	@ApiParam({ name: "id", description: "问卷 ID" })
	detail(@Param("id") id: string) {
		return this.surveyService.findById(id);
	}

	@UseGuards(JwtAuthGuard)
	@Post(":id/responses")
	@ApiOperation({ summary: "提交问卷" })
	@ApiParam({ name: "id", description: "问卷 ID" })
	@ApiBody({ type: SubmitSurveyResponseDto })
	respond(@ReqUser() user: any, @Param("id") id: string, @Body() dto: SubmitSurveyResponseDto) {
		return this.surveyService.submitResponse(user.userId, id, dto);
	}

	@Get(":id/results")
	@ApiOperation({ summary: "查询问卷统计结果" })
	@ApiParam({ name: "id", description: "问卷 ID" })
	stats(@Param("id") id: string) {
		return this.surveyService.getStatistics(id);
	}
}
