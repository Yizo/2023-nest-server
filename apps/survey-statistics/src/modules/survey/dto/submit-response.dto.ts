import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional } from "class-validator";

export class SubmitSurveyResponseDto {
	@ApiProperty({ description: "问题答案，key=questionId" })
	@IsObject()
	@IsNotEmpty()
	answers!: Record<string, any>;

	@ApiPropertyOptional({ description: "可选元数据" })
	@IsOptional()
	metadata?: string;
}
