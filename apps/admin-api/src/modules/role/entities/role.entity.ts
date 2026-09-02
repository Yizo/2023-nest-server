import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";
import { MenuEntity } from "@/modules/menu/entities/menu.entity";
import { RoleMenuEntity } from "./role-menu.entity";

const RoleSchema = defineEntity({
	name: "RoleEntity",
	tableName: "sys_role",
	comment: "角色",
	extends: SoftDeleteEntitySchema,
	properties: {
		roleName: p.string().length(100).fieldName("role_name").comment("角色名称"),
		roleCode: p.string().length(100).fieldName("role_code").comment("角色编码，创建后不可修改"),
		status: p.smallint().$type<0 | 1>().default(1).comment("状态，0 停用，1 启用"),
		remark: p.string().length(500).nullable().comment("备注"),
		menus: () =>
			p
				.manyToMany(MenuEntity)
				.pivotEntity(() => RoleMenuEntity)
				.joinColumn("role_id")
				.inverseJoinColumn("menu_id")
				.createForeignKeyConstraint(false)
				.cascade()
				.hidden(),
	},
	uniques: [
		{
			name: "uq_sys_role_code_active",
			properties: ["roleCode"],
			where: { deletedAt: null },
		},
	],
});

export class RoleEntity extends RoleSchema.class {}

RoleSchema.setClass(RoleEntity);
