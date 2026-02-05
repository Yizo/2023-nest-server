import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { SurveyQuestionDto } from './create-survey.dto';

export class UpdateSurveyDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: '问卷标题' })
  title?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: '问卷描述' })
  description?: string;

  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  @ArrayMinSize(1)
  @IsOptional()
  @ApiPropertyOptional({ type: [SurveyQuestionDto], description: '问题列表' })
  questions?: SurveyQuestionDto[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: '问卷状态' })
  status?: string;
}
