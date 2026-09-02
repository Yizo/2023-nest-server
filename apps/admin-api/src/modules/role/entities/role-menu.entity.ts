import { defineEntity, p } from "@mikro-orm/core";
import { MenuEntity } from "@/modules/menu/entities/menu.entity";
import { RoleEntity } from "./role.entity";

const RoleMenuSchema = defineEntity({
	name: "RoleMenuEntity",
	tableName: "sys_role_menu",
	comment: "角色菜单关联",
	properties: {
		role: () =>
			p
				.manyToOne(RoleEntity)
				.joinColumn("role_id")
				.primary()
				.createForeignKeyConstraint(false)
				.cascade()
				.comment("角色 ID"),
			menu: () =>
				p
					.manyToOne(MenuEntity)
					.joinColumn("menu_id")
					.primary()
					.createForeignKeyConstraint(false)
					.cascade()
					.comment("菜单 ID"),
		},
	indexes: [
		{
			name: "idx_sys_role_menu_menu",
			properties: ["menu"],
		},
	],
});

export class RoleMenuEntity extends RoleMenuSchema.class {}

RoleMenuSchema.setClass(RoleMenuEntity);
