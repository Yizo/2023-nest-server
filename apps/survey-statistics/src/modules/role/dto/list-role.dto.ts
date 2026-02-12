import { IsOptional } from "class-validator";

export class ListRoleDto {
	@IsOptional()
	name?: string;

	@IsOptional()
	code?: string;

	@IsOptional()
	description?: string;

	@IsOptional()
	page?: number;

	@IsOptional()
	pageSize?: number;
}
