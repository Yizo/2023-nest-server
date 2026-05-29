import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMonitorBizSystemDto {
	@ApiProperty({ description: "业务系统 ID" })
	@Type(() => Number)
	@IsNotEmpty({ message: "业务系统 ID 不能为空" })
	@IsInt({ message: "业务系统 ID 必须为整数" })
	id!: number;

	@ApiPropertyOptional({ description: "业务系统名称" })
	@IsOptional()
	@IsString()
	@MaxLength(128)
	name?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@IsBoolean()
	enabled?: boolean;
}
