import { ApiProperty } from "@nestjs/swagger";
import { MenuType } from "../menu.constants";

export class MenuResult {
	@ApiProperty({ description: "主键" })
	id!: number;

	@ApiProperty({ description: "菜单类型", enum: MenuType, enumName: "MenuType" })
	type!: MenuType;

	@ApiProperty({ description: "父菜单 ID，空表示根菜单", nullable: true })
	parentId!: number | null;

	@ApiProperty({ description: "名称" })
	name!: string;

	@ApiProperty({ description: "编码，操作类型必填，其他类型可为空", nullable: true })
	code!: string | null;

	@ApiProperty({ description: "路由名称，页面或菜单类型可用，其他类型为空", nullable: true })
	routeName!: string | null;

	@ApiProperty({ description: "路由路径，页面和外链类型必填，菜单和操作类型可为空", nullable: true })
	path!: string | null;

	@ApiProperty({ description: "页面组件，页面类型必填，其他类型为空", nullable: true })
	component!: string | null;

	@ApiProperty({ description: "重定向地址，页面或菜单类型可用", nullable: true })
	redirect!: string | null;

	@ApiProperty({ description: "图标，页面、菜单或外链类型可用", nullable: true })
	icon!: string | null;

	@ApiProperty({ description: "排序" })
	sort!: number;

	@ApiProperty({ description: "是否显示" })
	visible!: boolean;

	@ApiProperty({ description: "是否缓存页面，仅页面类型可用", nullable: true })
	keepAlive!: boolean | null;

	@ApiProperty({ description: "创建时间" })
	createdAt!: Date;

	@ApiProperty({ description: "更新时间" })
	updatedAt!: Date;
}
