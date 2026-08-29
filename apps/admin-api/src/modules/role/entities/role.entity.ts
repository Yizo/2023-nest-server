import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";
import { DataScope } from "../role.constants";

const RoleSchema = defineEntity({
	name: "RoleEntity",
	tableName: "sys_role",
	comment: "角色",
	extends: SoftDeleteEntitySchema,
	properties: {
		roleName: p.string().length(100).fieldName("role_name").comment("角色名称"),
		roleCode: p.string().length(100).fieldName("role_code").comment("角色编码，创建后不可修改"),
		dataScope: p
			.string()
			.$type<DataScope>()
			.length(100)
			.fieldName("data_scope")
			.default(DataScope.NONE)
			.comment(
				"数据范围枚举值, all: 可访问全部数据, custom: 可访问已配置的自定义数据范围, department: 仅可访问当前部门数据, department_and_children: 可访问当前部门及其下级部门数据, self: 仅可访问当前用户数据, none: 无数据权限",
			),
		status: p.smallint().$type<0 | 1>().default(1).comment("状态，0 停用，1 启用"),
		remark: p.string().length(500).nullable().comment("备注"),
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
