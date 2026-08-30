import { defineEntity, p } from "@mikro-orm/core";
import { DepartmentEntity } from "@/modules/department/entities";
import { UserEntity } from "./user.entity";

const UserDepartmentSchema = defineEntity({
	name: "UserDepartmentEntity",
	tableName: "sys_user_dept",
	comment: "用户部门关联",
	properties: {
		user: () =>
			p
				.manyToOne(UserEntity)
				.joinColumn("user_id")
				.primary()
				.createForeignKeyConstraint(false)
				.cascade()
				.comment("用户 ID"),
		department: () =>
			p
				.manyToOne(DepartmentEntity)
				.joinColumn("dept_id")
				.primary()
				.createForeignKeyConstraint(false)
				.cascade()
				.comment("部门 ID"),
	},
	indexes: [
		{
			name: "idx_sys_user_dept_dept",
			properties: ["department"],
		},
	],
});

export class UserDepartmentEntity extends UserDepartmentSchema.class {}

UserDepartmentSchema.setClass(UserDepartmentEntity);
