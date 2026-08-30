import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";
import { DepartmentEntity } from "@/modules/department/entities";
import { RoleEntity } from "@/modules/role/entities";
import { UserDepartmentEntity } from "./user-department.entity";
import { UserRoleEntity } from "./user-role.entity";

const UserSchema = defineEntity({
	name: "UserEntity",
	tableName: "sys_user",
	comment: "用户",
	extends: SoftDeleteEntitySchema,
	properties: {
		userName: p.string().length(100).fieldName("user_name").comment("用户账号，创建后不可修改"),
		displayName: p.string().length(100).fieldName("display_name").comment("显示名称"),
		passwordHash: p
			.string()
			.length(255)
			.fieldName("password_hash")
			.lazy()
			.hidden()
			.comment("密码哈希"),
		status: p.smallint().$type<0 | 1>().default(1).comment("状态，0 停用，1 启用"),
		roles: () =>
			p
				.manyToMany(RoleEntity) // 多对多：一个用户对应多个角色
				.pivotEntity(() => UserRoleEntity) // 中间表实体 sys_user_role
				.joinColumn("user_id") // 中间表指向当前用户的列
				.inverseJoinColumn("role_id") // 中间表指向角色的列
				.createForeignKeyConstraint(false)
				.cascade()
				.hidden(),
		departments: () =>
			p
				.manyToMany(DepartmentEntity)
				.pivotEntity(() => UserDepartmentEntity)
				.joinColumn("user_id")
				.inverseJoinColumn("dept_id")
				.createForeignKeyConstraint(false)
				.cascade()
				.hidden(),
	},
	uniques: [
		{
			name: "uq_sys_user_name_active",
			properties: ["userName"],
			where: { deletedAt: null },
		},
	],
});

export class UserEntity extends UserSchema.class {}

UserSchema.setClass(UserEntity);
