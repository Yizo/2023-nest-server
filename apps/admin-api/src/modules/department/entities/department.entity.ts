import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";

const DepartmentSchema = defineEntity({
	name: "DepartmentEntity",
	tableName: "sys_dept",
	comment: "部门",
	extends: SoftDeleteEntitySchema,
	properties: {
		deptName: p.string().length(100).fieldName("dept_name").comment("部门名称"),
		parentId: p
			.integer()
			.nullable()
			.fieldName("parent_id")
			.comment("父部门 ID，空表示根部门"),
		ancestors: p
			.string()
			.length(1000)
			.default("")
			.comment("祖级部门 ID 列表，逗号分隔，不含自身"),
		sort: p.integer().default(0).comment("排序，数值越小越靠前"),
		status: p.smallint().$type<0 | 1>().default(1).comment("状态，0 停用，1 启用"),
	},
	indexes: [
		{
			name: "idx_sys_dept_parent_active",
			properties: ["parentId"],
			where: { deletedAt: null },
		},
	],
});

export class DepartmentEntity extends DepartmentSchema.class {}

DepartmentSchema.setClass(DepartmentEntity);
