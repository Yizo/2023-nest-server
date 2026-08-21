import { Transform } from "class-transformer";
import {
	IsBoolean,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	MaxLength,
	Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/pagination/pagination";

// 系统 DTO 只描述输入边界；关联记录是否存在由 SystemService 校验。
export class CreateDictionaryTypeDto {
	@ApiProperty({ description: "字典类型编码，创建后不可修改", example: "user-status", minLength: 2, maxLength: 80 })
	@IsString({ message: "字典类型编码不能为空" })
	@Length(2, 80, { message: "字典类型编码长度必须在 2 到 80 个字符之间" })
	code!: string;

	@ApiProperty({ description: "字典类型名称", example: "用户状态", minLength: 1, maxLength: 100 })
	@IsString({ message: "字典类型名称不能为空" })
	@Length(1, 100, { message: "字典类型名称长度必须在 1 到 100 个字符之间" })
	name!: string;
}

export class DictionaryTypeListQueryDto extends PageQueryDto {
	@ApiPropertyOptional({ description: "按字典类型名称筛选", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "字典类型名称必须是字符串" })
	@MaxLength(100, { message: "字典类型名称不能超过 100 个字符" })
	name?: string;

	@ApiPropertyOptional({ description: "按字典类型编码筛选", maxLength: 80 })
	@IsOptional()
	@IsString({ message: "字典类型编码必须是字符串" })
	@MaxLength(80, { message: "字典类型编码不能超过 80 个字符" })
	code?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@Transform(({ value }) => value === "true" ? true : value === "false" ? false : value)
	@IsBoolean({ message: "字典类型启用状态必须是布尔值" })
	enabled?: boolean;

	@ApiPropertyOptional({ description: "按创建时间排序", enum: ["asc", "desc"] })
	@IsOptional()
	@IsIn(["asc", "desc"], { message: "排序方式只能是 asc 或 desc" })
	sort?: "asc" | "desc";
}

export class DictionaryItemListQueryDto extends PageQueryDto {
	@ApiProperty({ description: "所属字典类型 ID（UUIDv7）" })
	@IsUUID("7", { message: "字典类型 ID 格式不正确" })
	dictTypeId!: string;

	@ApiPropertyOptional({ description: "按字典项名称筛选", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "字典项名称必须是字符串" })
	@MaxLength(100, { message: "字典项名称不能超过 100 个字符" })
	label?: string;

	@ApiPropertyOptional({ description: "按字典项值筛选", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "字典项值必须是字符串" })
	@MaxLength(100, { message: "字典项值不能超过 100 个字符" })
	value?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@Transform(({ value }) => value === "true" ? true : value === "false" ? false : value)
	@IsBoolean({ message: "字典项启用状态必须是布尔值" })
	enabled?: boolean;

	@ApiPropertyOptional({ description: "按创建时间排序", enum: ["asc", "desc"] })
	@IsOptional()
	@IsIn(["asc", "desc"], { message: "排序方式只能是 asc 或 desc" })
	sort?: "asc" | "desc";
}

export class UpdateDictionaryTypeDto {
	@ApiPropertyOptional({ description: "字典类型名称", minLength: 1, maxLength: 100 })
	@IsOptional()
	@IsString({ message: "字典类型名称必须是字符串" })
	@Length(1, 100, { message: "字典类型名称长度必须在 1 到 100 个字符之间" })
	name?: string;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@IsBoolean({ message: "字典类型启用状态必须是布尔值" })
	enabled?: boolean;
}

export class CreateDictionaryItemDto {
	@ApiProperty({ description: "所属字典类型 ID（UUIDv7）" })
	@IsUUID("7", { message: "字典类型 ID 格式不正确" })
	dictTypeId!: string;

	@ApiProperty({ description: "字典项展示名称", example: "启用", minLength: 1, maxLength: 100 })
	@IsString({ message: "字典项名称不能为空" })
	@Length(1, 100, { message: "字典项名称长度必须在 1 到 100 个字符之间" })
	label!: string;

	@ApiProperty({ description: "字典项存储值", example: "active", minLength: 1, maxLength: 100 })
	@IsString({ message: "字典项值不能为空" })
	@Length(1, 100, { message: "字典项值长度必须在 1 到 100 个字符之间" })
	value!: string;

	@ApiPropertyOptional({ description: "排序值，越小越靠前", example: 0, minimum: 0 })
	@IsOptional()
	@IsInt({ message: "字典项排序值必须是整数" })
	@Min(0, { message: "字典项排序值不能小于 0" })
	sortOrder = 0;
}

export class UpdateDictionaryItemDto {
	@ApiPropertyOptional({ description: "字典项展示名称", minLength: 1, maxLength: 100 })
	@IsOptional()
	@IsString({ message: "字典项名称必须是字符串" })
	@Length(1, 100, { message: "字典项名称长度必须在 1 到 100 个字符之间" })
	label?: string;

	@ApiPropertyOptional({ description: "排序值，越小越靠前", minimum: 0 })
	@IsOptional()
	@IsInt({ message: "字典项排序值必须是整数" })
	@Min(0, { message: "字典项排序值不能小于 0" })
	sortOrder?: number;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@IsBoolean({ message: "字典项启用状态必须是布尔值" })
	enabled?: boolean;
}

export class CreateMenuDto {
	@ApiPropertyOptional({ description: "父菜单 ID（UUIDv7）；不传表示顶级菜单" })
	@IsOptional()
	@IsUUID("7", { message: "父菜单 ID 格式不正确" })
	parentId?: string;

	@ApiPropertyOptional({ description: "绑定的权限 ID（UUIDv7），用于菜单可见性" })
	@IsOptional()
	@IsUUID("7", { message: "权限 ID 格式不正确" })
	permissionId?: string;

	@ApiProperty({ description: "菜单名称", example: "角色管理", minLength: 1, maxLength: 100 })
	@IsString({ message: "菜单名称不能为空" })
	@Length(1, 100, { message: "菜单名称长度必须在 1 到 100 个字符之间" })
	name!: string;

	@ApiProperty({ description: "前端路由路径", example: "/admin/roles", minLength: 1, maxLength: 200 })
	@IsString({ message: "菜单路径不能为空" })
	@Length(1, 200, { message: "菜单路径长度必须在 1 到 200 个字符之间" })
	path!: string;

	@ApiPropertyOptional({ description: "排序值，越小越靠前", example: 0, minimum: 0 })
	@IsOptional()
	@IsInt({ message: "菜单排序值必须是整数" })
	@Min(0, { message: "菜单排序值不能小于 0" })
	sortOrder = 0;
}

export class UpdateMenuDto {
	@ApiPropertyOptional({ description: "父菜单 ID；传 null 表示改为顶级菜单", nullable: true })
	@IsOptional()
	@IsUUID("7", { message: "父菜单 ID 格式不正确" })
	parentId?: string | null;

	@ApiPropertyOptional({ description: "绑定的权限 ID；传 null 表示解除绑定", nullable: true })
	@IsOptional()
	@IsUUID("7", { message: "权限 ID 格式不正确" })
	permissionId?: string | null;

	@ApiPropertyOptional({ description: "菜单名称", minLength: 1, maxLength: 100 })
	@IsOptional()
	@IsString({ message: "菜单名称必须是字符串" })
	@Length(1, 100, { message: "菜单名称长度必须在 1 到 100 个字符之间" })
	name?: string;

	@ApiPropertyOptional({ description: "前端路由路径", minLength: 1, maxLength: 200 })
	@IsOptional()
	@IsString({ message: "菜单路径必须是字符串" })
	@Length(1, 200, { message: "菜单路径长度必须在 1 到 200 个字符之间" })
	path?: string;

	@ApiPropertyOptional({ description: "排序值，越小越靠前", minimum: 0 })
	@IsOptional()
	@IsInt({ message: "菜单排序值必须是整数" })
	@Min(0, { message: "菜单排序值不能小于 0" })
	sortOrder?: number;

	@ApiPropertyOptional({ description: "是否启用" })
	@IsOptional()
	@IsBoolean({ message: "菜单启用状态必须是布尔值" })
	enabled?: boolean;
}

export class UpsertSystemConfigDto {
	@ApiProperty({ description: "配置键", example: "survey.maxQuestions", minLength: 2, maxLength: 120 })
	@IsString({ message: "配置键不能为空" })
	@Length(2, 120, { message: "配置键长度必须在 2 到 120 个字符之间" })
	key!: string;

	@ApiProperty({ description: "配置值；json 类型请传 JSON 字符串", maxLength: 20000 })
	@IsString({ message: "配置值不能为空" })
	@MaxLength(20_000, { message: "配置值不能超过 20000 个字符" })
	value!: string;

	@ApiProperty({ description: "配置值类型", enum: ["string", "number", "boolean", "json"] })
	@IsIn(["string", "number", "boolean", "json"], {
		message: "配置值类型只能是 string、number、boolean 或 json",
	})
	valueType!: "string" | "number" | "boolean" | "json";

	@ApiPropertyOptional({ description: "配置说明", maxLength: 500 })
	@IsOptional()
	@IsString({ message: "配置说明必须是字符串" })
	@MaxLength(500, { message: "配置说明不能超过 500 个字符" })
	description?: string;
}
