import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional } from "class-validator";

export class ListMonitorLogsDto {
	@ApiProperty({ description: "业务系统 ID" })
	@Type(() => Number)
	@IsNotEmpty({ message: "业务系统 ID 不能为空" })
	@IsInt({ message: "业务系统 ID 必须为整数" })
	systemId!: number;

	@IsOptional()
	page?: number;

	@IsOptional()
	pageSize?: number;
}
