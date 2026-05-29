import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateMonitorBizSystemDto {
	@ApiProperty({ description: "业务系统名称" })
	@IsNotEmpty({ message: "业务系统名称不能为空" })
	@IsString()
	@MaxLength(128)
	name!: string;

	@ApiPropertyOptional({ description: "是否启用，默认 true" })
	@IsOptional()
	@IsBoolean()
	enabled?: boolean;
}
