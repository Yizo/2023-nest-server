import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, ValidateNested, ArrayMinSize } from "class-validator";
import { Type } from "class-transformer";

export class SurveyQuestionDto {
	@ApiProperty({ description: "问题 ID" })
	@IsString()
	id!: string;

	@ApiProperty({ description: "问题文本" })
	@IsString()
	text!: string;

	@ApiProperty({ description: "问题类型", enum: ["single", "multiple", "text"] })
	@IsString()
	type!: "single" | "multiple" | "text";

	@ApiPropertyOptional({ description: "可选项" })
	@IsOptional()
	options?: string[];
}

export class CreateSurveyDto {
	@ApiProperty({ description: "问卷标题" })
	@IsNotEmpty()
	@IsString()
	title!: string;

	@ApiPropertyOptional({ description: "问卷描述" })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiProperty({ type: [SurveyQuestionDto], description: "问题列表" })
	@ValidateNested({ each: true })
	@Type(() => SurveyQuestionDto)
	@ArrayMinSize(1)
	questions!: SurveyQuestionDto[];
}
