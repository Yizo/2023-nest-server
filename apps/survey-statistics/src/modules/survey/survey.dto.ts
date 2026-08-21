import { Type } from "class-transformer";
import {
	ArrayMinSize,
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsIn,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	MaxLength,
	ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/pagination/pagination";

/** DTO 负责字段类型和长度；题型与选项的组合规则由 SurveyService 校验。 */
export class SurveyOptionInputDto {
	@ApiProperty({ description: "选项展示文案", example: "非常满意", minLength: 1, maxLength: 500 })
	@IsString({ message: "选项内容不能为空" })
	@Length(1, 500, { message: "选项内容长度必须在 1 到 500 个字符之间" })
	label!: string;
}

export class SurveyQuestionInputDto {
	@ApiProperty({
		description: "题型：single 单选、multiple 多选、text 填空、number 数字",
		enum: ["single", "multiple", "text", "number"],
		example: "single",
	})
	@IsIn(["single", "multiple", "text", "number"], {
		message: "问题类型只能是 single、multiple、text 或 number",
	})
	type!: "single" | "multiple" | "text" | "number";

	@ApiProperty({ description: "问题标题", example: "您对本服务的整体满意度？", minLength: 1, maxLength: 1000 })
	@IsString({ message: "问题标题不能为空" })
	@Length(1, 1_000, { message: "问题标题长度必须在 1 到 1000 个字符之间" })
	title!: string;

	@ApiProperty({ description: "是否必答", example: true })
	@IsBoolean({ message: "必答状态必须是布尔值" })
	required = true;

	@ApiPropertyOptional({
		description: "选项列表；单选/多选题必填，填空/数字题可为空",
		type: () => SurveyOptionInputDto,
		isArray: true,
	})
	@IsOptional()
	@IsArray({ message: "问题选项必须是数组" })
	@ValidateNested({ each: true, message: "问题选项格式不正确" })
	@Type(() => SurveyOptionInputDto)
	options: SurveyOptionInputDto[] = [];
}

export class CreateSurveyDto {
	@ApiProperty({ description: "问卷标题", example: "客户满意度调查", minLength: 1, maxLength: 200 })
	@IsString({ message: "问卷标题不能为空" })
	@Length(1, 200, { message: "问卷标题长度必须在 1 到 200 个字符之间" })
	title!: string;

	@ApiPropertyOptional({ description: "问卷说明", maxLength: 5000 })
	@IsOptional()
	@IsString({ message: "问卷说明必须是字符串" })
	@MaxLength(5_000, { message: "问卷说明不能超过 5000 个字符" })
	description?: string;

	@ApiProperty({ description: "问题列表，至少一题", type: () => SurveyQuestionInputDto, isArray: true })
	@IsArray({ message: "问题列表必须是数组" })
	@ArrayMinSize(1, { message: "问卷至少需要一个问题" })
	@ValidateNested({ each: true, message: "问题格式不正确" })
	@Type(() => SurveyQuestionInputDto)
	questions!: SurveyQuestionInputDto[];
}

export class UpdateSurveyDto extends CreateSurveyDto {}

export class SurveyListQueryDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "问卷状态", enum: ["draft", "published", "closed"] })
	@IsOptional()
	@IsIn(["draft", "published", "closed"], {
		message: "问卷状态只能是 draft、published 或 closed",
	})
	status?: "draft" | "published" | "closed";
}

export class SurveyAnswerInputDto {
	@ApiProperty({ description: "问题 ID（UUIDv7）" })
	@IsUUID("7", { message: "问题 ID 格式不正确" })
	questionId!: string;

	@ApiPropertyOptional({ description: "选中的选项 ID 列表；单选/多选题使用", type: [String], default: [] })
	@IsOptional()
	@IsArray({ message: "选项 ID 列表必须是数组" })
	@ArrayUnique({ message: "选项 ID 不能重复" })
	@IsUUID("7", { each: true, message: "选项 ID 格式不正确" })
	optionIds: string[] = [];

	@ApiPropertyOptional({ description: "填空题文本答案", maxLength: 10000 })
	@IsOptional()
	@IsString({ message: "文本答案必须是字符串" })
	@MaxLength(10_000, { message: "文本答案不能超过 10000 个字符" })
	textValue?: string;

	@ApiPropertyOptional({ description: "数字题答案" })
	@IsOptional()
	@IsNumber({}, { message: "数字答案必须是有效数字" })
	numberValue?: number;
}

export class SubmitSurveyDto {
	@ApiProperty({ description: "答卷内容，需覆盖所有必答题", type: () => SurveyAnswerInputDto, isArray: true })
	@IsArray({ message: "答案列表必须是数组" })
	@ValidateNested({ each: true, message: "答案格式不正确" })
	@Type(() => SurveyAnswerInputDto)
	answers!: SurveyAnswerInputDto[];
}
