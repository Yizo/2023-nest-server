import { defineEntity, p } from "@mikro-orm/core";
import { RoleEntity } from "@/modules/role/entities";
import { UserEntity } from "./user.entity";

const UserRoleSchema = defineEntity({
	name: "UserRoleEntity",
	tableName: "sys_user_role",
	comment: "用户角色关联",
	properties: {
		user: () =>
			p
				.manyToOne(UserEntity)
				.joinColumn("user_id")
				.primary()
				.createForeignKeyConstraint(false)
				.cascade()
				.comment("用户 ID"),
		role: () =>
			p
				.manyToOne(RoleEntity)
				.joinColumn("role_id")
				.primary()
				.createForeignKeyConstraint(false)
				.cascade()
				.comment("角色 ID"),
	},
	indexes: [
		{
			name: "idx_sys_user_role_role",
			properties: ["role"],
		},
	],
});

export class UserRoleEntity extends UserRoleSchema.class {}

UserRoleSchema.setClass(UserRoleEntity);
