import { Type } from "class-transformer";
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Matches,
	Min,
	ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MenuType } from "../menu.constants";

export class CreateMenuDto {
	@ApiProperty({ description: "菜单类型", enum: MenuType, enumName: "MenuType" })
	@IsEnum(MenuType, { message: "菜单类型不是有效值" })
	type!: MenuType;

	@ApiPropertyOptional({
		description: "父菜单 ID，空表示根菜单",
		type: Number,
		minimum: 1,
		nullable: true,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: "父菜单 ID 必须是整数" })
	@Min(1, { message: "父菜单 ID 必须是正整数" })
	parentId?: number | null;

	@ApiProperty({ description: "名称", maxLength: 100 })
	@IsString({ message: "名称必须是字符串" })
	@Length(1, 100, { message: "名称长度必须在 1 到 100 个字符之间" })
	name!: string;

	@ApiPropertyOptional({ description: "编码，操作类型必须填写，其他类型可选", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "编码必须是字符串" })
	@Length(1, 100, { message: "编码长度必须在 1 到 100 个字符之间" })
	@Matches(/^[A-Za-z0-9_:.-]+$/, { message: "编码只能包含字母、数字、下划线、冒号、点和短横线" })
	code?: string | null;

	@ApiPropertyOptional({ description: "路由名称，页面类型建议填写，外链和操作类型不能填写", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "路由名称必须是字符串" })
	@Length(1, 100, { message: "路由名称长度必须在 1 到 100 个字符之间" })
	routeName?: string | null;

	@ApiPropertyOptional({ description: "路由路径，页面和外链类型必须填写", maxLength: 255 })
	@ValidateIf((dto, value) => dto.type === MenuType.PAGE || dto.type === MenuType.EXTERNAL || (value !== undefined && value !== null))
	@IsString({ message: "路由路径必须是字符串" })
	@Length(1, 255, { message: "路由路径长度必须在 1 到 255 个字符之间" })
	path?: string | null;

	@ApiPropertyOptional({ description: "页面组件，页面类型必须填写", maxLength: 255 })
	@ValidateIf((dto, value) => dto.type === MenuType.PAGE || (value !== undefined && value !== null))
	@IsString({ message: "页面组件必须是字符串" })
	@Length(1, 255, { message: "页面组件长度必须在 1 到 255 个字符之间" })
	component?: string | null;

	@ApiPropertyOptional({ description: "重定向地址，页面或菜单类型可填写", maxLength: 255 })
	@IsOptional()
	@IsString({ message: "重定向地址必须是字符串" })
	@Length(1, 255, { message: "重定向地址长度必须在 1 到 255 个字符之间" })
	redirect?: string | null;

	@ApiPropertyOptional({ description: "图标，页面、菜单或外链类型可填写", maxLength: 100 })
	@IsOptional()
	@IsString({ message: "图标必须是字符串" })
	@Length(1, 100, { message: "图标长度必须在 1 到 100 个字符之间" })
	icon?: string | null;

	@ApiPropertyOptional({ description: "排序，数值越小越靠前", default: 0 })
	@ValidateIf((_, value) => value !== undefined)
	@Type(() => Number)
	@IsInt({ message: "排序必须是整数" })
	@Min(0, { message: "排序不能小于 0" })
	sort?: number;

	@ApiPropertyOptional({ description: "是否显示，操作类型通常没有实际意义", default: true })
	@ValidateIf((_, value) => value !== undefined)
	@IsBoolean({ message: "是否显示必须是布尔值" })
	visible?: boolean;

	@ApiPropertyOptional({ description: "是否缓存页面，仅页面类型可填写", default: false })
	@IsOptional()
	@IsBoolean({ message: "是否缓存页面必须是布尔值" })
	keepAlive?: boolean | null;
}
