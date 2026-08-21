import { Transform, Type } from "class-transformer";
import {
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsEmail,
	IsIn,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	MaxLength,
	MinLength,
	ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/pagination/pagination";

/** 身份模块 DTO：只负责校验输入，不直接操作数据库。 */
export class UserListQueryDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "按用户名、邮箱或显示名称模糊搜索", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "搜索关键词必须是字符串" })
	@MaxLength(100, { message: "搜索关键词不能超过 100 个字符" })
	search?: string;

	@ApiPropertyOptional({ description: "用户状态", enum: ["active", "disabled"] })
	@IsOptional()
	@IsIn(["active", "disabled"], { message: "用户状态只能是 active 或 disabled" })
	status?: "active" | "disabled";
}

export class RoleListQueryDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "按角色名称筛选", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "角色名称必须是字符串" })
	@MaxLength(100, { message: "角色名称不能超过 100 个字符" })
	name?: string;

	@ApiPropertyOptional({ description: "按角色编码筛选", maxLength: 80 })
	@IsOptional()
	@IsString({ message: "角色编码必须是字符串" })
	@MaxLength(80, { message: "角色编码不能超过 80 个字符" })
	code?: string;

	@ApiPropertyOptional({ description: "按角色说明筛选", maxLength: 500 })
	@IsOptional()
	@IsString({ message: "角色说明必须是字符串" })
	@MaxLength(500, { message: "角色说明不能超过 500 个字符" })
	description?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@IsBoolean({ message: "角色启用状态必须是布尔值" })
	enabled?: boolean;
}

export class CreateUserDto {
	@ApiProperty({ description: "登录用户名，创建后按小写存储", example: "editor", minLength: 2, maxLength: 80 })
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	@IsString({ message: "用户名不能为空" })
	@Length(2, 80, { message: "用户名长度必须在 2 到 80 个字符之间" })
	username!: string;

	@ApiProperty({ description: "登录邮箱", example: "editor@example.com", maxLength: 160 })
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	@IsEmail({}, { message: "邮箱格式不正确" })
	@MaxLength(160, { message: "邮箱不能超过 160 个字符" })
	email!: string;

	@ApiProperty({ description: "界面显示名称", example: "编辑人员", minLength: 1, maxLength: 80 })
	@IsString({ message: "显示名称不能为空" })
	@Length(1, 80, { message: "显示名称长度必须在 1 到 80 个字符之间" })
	displayName!: string;

	@ApiProperty({ description: "初始密码，至少 10 位", minLength: 10, maxLength: 128 })
	@IsString({ message: "密码不能为空" })
	@MinLength(10, { message: "密码不能少于 10 个字符" })
	@MaxLength(128, { message: "密码不能超过 128 个字符" })
	password!: string;

	@ApiPropertyOptional({ description: "初始角色 ID 列表（UUIDv7）", type: [String], default: [] })
	@IsOptional()
	@IsArray({ message: "角色列表必须是数组" })
	@ArrayUnique({ message: "角色列表不能包含重复项" })
	@IsUUID("7", { each: true, message: "角色 ID 格式不正确" })
	roleIds: string[] = [];
}

export class UpdateUserDto {
	@ApiPropertyOptional({ description: "界面显示名称", minLength: 1, maxLength: 80 })
	@IsOptional()
	@IsString({ message: "显示名称必须是字符串" })
	@Length(1, 80, { message: "显示名称长度必须在 1 到 80 个字符之间" })
	displayName?: string;

	@ApiPropertyOptional({ description: "用户状态；禁用后不可登录", enum: ["active", "disabled"] })
	@IsOptional()
	@IsIn(["active", "disabled"], { message: "用户状态只能是 active 或 disabled" })
	status?: "active" | "disabled";
}

export class AssignRolesDto {
	@ApiProperty({ description: "要绑定的角色 ID 列表（UUIDv7），会覆盖该用户当前角色", type: [String] })
	@IsArray({ message: "角色列表必须是数组" })
	@ArrayUnique({ message: "角色列表不能包含重复项" })
	@IsUUID("7", { each: true, message: "角色 ID 格式不正确" })
	roleIds!: string[];
}

export class CreateRoleDto {
	@ApiProperty({ description: "角色编码，创建后不可修改", example: "survey-editor", minLength: 2, maxLength: 80 })
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	@IsString({ message: "角色编码不能为空" })
	@Length(2, 80, { message: "角色编码长度必须在 2 到 80 个字符之间" })
	code!: string;

	@ApiProperty({ description: "角色名称", example: "问卷编辑", minLength: 1, maxLength: 100 })
	@IsString({ message: "角色名称不能为空" })
	@Length(1, 100, { message: "角色名称长度必须在 1 到 100 个字符之间" })
	name!: string;

	@ApiPropertyOptional({ description: "角色说明", maxLength: 500 })
	@IsOptional()
	@IsString({ message: "角色说明必须是字符串" })
	@MaxLength(500, { message: "角色说明不能超过 500 个字符" })
	description?: string;
}

export class UpdateRoleDto {
	@ApiPropertyOptional({ description: "角色名称", minLength: 1, maxLength: 100 })
	@IsOptional()
	@IsString({ message: "角色名称必须是字符串" })
	@Length(1, 100, { message: "角色名称长度必须在 1 到 100 个字符之间" })
	name?: string;

	@ApiPropertyOptional({ description: "角色说明", maxLength: 500 })
	@IsOptional()
	@IsString({ message: "角色说明必须是字符串" })
	@MaxLength(500, { message: "角色说明不能超过 500 个字符" })
	description?: string;

	@ApiPropertyOptional({ description: "是否启用；关闭后相当于停用该角色，不再物理删除" })
	@IsOptional()
	@IsBoolean({ message: "角色启用状态必须是布尔值" })
	enabled?: boolean;
}

export class AssignPermissionsDto {
	@ApiProperty({ description: "要绑定的权限 ID 列表（UUIDv7），会覆盖该角色当前权限", type: [String] })
	@IsArray({ message: "权限列表必须是数组" })
	@ArrayUnique({ message: "权限列表不能包含重复项" })
	@IsUUID("7", { each: true, message: "权限 ID 格式不正确" })
	permissionIds!: string[];
}

export class BulkUserRoleDto {
	@ApiProperty({ description: "批量角色分配参数", type: () => AssignRolesDto })
	@ValidateNested({ message: "角色分配参数不正确" })
	@Type(() => AssignRolesDto)
	assignment!: AssignRolesDto;
}
