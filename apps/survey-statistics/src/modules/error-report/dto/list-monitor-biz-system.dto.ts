import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ListMonitorBizSystemDto {
	@ApiPropertyOptional({ description: "appId 模糊搜索" })
	@IsOptional()
	@IsString()
	appId?: string;

	@ApiPropertyOptional({ description: "名称模糊搜索" })
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@Transform(({ value }) => {
		if (value === undefined || value === null || value === "") {
			return undefined;
		}
		return value === true || value === "true" || value === "1";
	})
	@IsBoolean()
	enabled?: boolean;

	@IsOptional()
	page?: number;

	@IsOptional()
	pageSize?: number;
}
