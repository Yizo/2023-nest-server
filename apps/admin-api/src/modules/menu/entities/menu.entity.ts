import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";
import { MenuType } from "../menu.constants";

const MenuSchema = defineEntity({
	name: "MenuEntity",
	tableName: "sys_menu",
	comment: "菜单",
	extends: SoftDeleteEntitySchema,
	properties: {
		type: p
			.string()
			.$type<MenuType>()
			.length(20)
			.comment("类型，page 页面，menu 菜单，external 外链，action 操作"),
		parentId: p
			.integer()
			.nullable()
			.fieldName("parent_id")
			.comment("父菜单 ID，空表示根菜单"),
		name: p.string().length(100).comment("名称"),
		code: p.string().length(100).nullable().comment("操作编码"),
		routeName: p.string().length(100).fieldName("route_name").nullable().comment("路由名称"),
		path: p.string().length(255).nullable().comment("路由路径"),
		component: p.string().length(255).nullable().comment("页面组件"),
		redirect: p.string().length(255).nullable().comment("重定向地址"),
		icon: p.string().length(100).nullable().comment("图标"),
		sort: p.integer().default(0).comment("排序，数值越小越靠前"),
		visible: p.boolean().default(true).comment("是否显示"),
		keepAlive: p.boolean().fieldName("keep_alive").nullable().comment("是否缓存页面"),
	},
	uniques: [
		{
			name: "uq_sys_menu_code_active",
			properties: ["code"],
			where: { deletedAt: null },
		},
		{
			name: "uq_sys_menu_route_name_active",
			properties: ["routeName"],
			where: { deletedAt: null },
		},
	],
	indexes: [
		{
			name: "idx_sys_menu_parent_active",
			properties: ["parentId"],
			where: { deletedAt: null },
		},
	],
});

export class MenuEntity extends MenuSchema.class {}

MenuSchema.setClass(MenuEntity);
