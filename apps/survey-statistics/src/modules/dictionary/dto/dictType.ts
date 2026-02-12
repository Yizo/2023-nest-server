import { IsNotEmpty, MaxLength, IsOptional, IsIn } from "class-validator";

export class CreateDictTypeDto {
	@IsNotEmpty({ message: "字典类型名称不能为空" })
	@MaxLength(10, { message: "字典类型名称不能超过10个字符" })
	name!: string;

	@IsOptional()
	@IsIn([0, 1], { message: "字典类型状态必须为0或1" })
	status?: number;

	@IsOptional()
	@MaxLength(100, { message: "描述不能超过100个字符" })
	description?: string;
}

export class UpdateDictTypeDto extends CreateDictTypeDto {
	@IsNotEmpty({ message: "字典类型ID不能为空" })
	id: number;
}

export class GetDictTypeDto {
	@IsOptional()
	page?: number;

	@IsOptional()
	pageSize?: number;

	@IsOptional()
	name?: string;

	@IsOptional()
	@IsIn(["0", "1"], { message: "字典类型状态必须为0或1" })
	status?: number;

	@IsOptional()
	@IsIn(["asc", "desc"], { message: "排序必须为asc或desc" })
	sort?: "asc" | "desc";
}
