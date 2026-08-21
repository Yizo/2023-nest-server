import type { Opt } from "@mikro-orm/core";
import { Entity, Index, Property, Unique } from "@mikro-orm/decorators/legacy";
import { BaseEntity, SoftDeleteEntity } from "@/database/base.entity";

export const USER_STATUS = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUS)[number];

/** 用户、角色、权限和两张关系表组成 RBAC 的最小模型。 */
@Entity({ tableName: "users" })
@Unique({ name: "uq_users_email", properties: ["email"] })
@Unique({ name: "uq_users_username", properties: ["username"] })
@Index({ name: "idx_users_status_created", properties: ["status", "createdAt"] })
export class User extends SoftDeleteEntity {
  // 登录用户名统一保存为小写，输入 superAdmin 时会转换成 superadmin。
  @Property({ length: 80 })
  username!: string;

  @Property({ length: 160 })
  email!: string;

  @Property({ fieldName: "display_name", length: 80 })
  displayName!: string;

  @Property({ fieldName: "password_hash", length: 255, hidden: true })
  passwordHash!: string;

  @Property({ length: 20 })
  status: Opt<UserStatus> = "active";

  // 平台所有者是首个管理员引导身份，不等同于某个固定角色。
  @Property({ fieldName: "is_platform_owner" })
  isPlatformOwner: Opt<boolean> = false;

  @Property({ fieldName: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt: Date | null = null;
}

@Entity({ tableName: "user_profiles" })
@Unique({ name: "uq_user_profiles_user", properties: ["userId"] })
export class UserProfile extends BaseEntity {
  @Property({ fieldName: "user_id", type: "uuid" })
  userId!: string;

  @Property({ type: "string", length: 40, nullable: true })
  phone: string | null = null;

  @Property({ type: "string", length: 500, nullable: true })
  avatar: string | null = null;
}

@Entity({ tableName: "roles" })
@Unique({ name: "uq_roles_code", properties: ["code"] })
@Index({ name: "idx_roles_enabled", properties: ["enabled"] })
export class Role extends SoftDeleteEntity {
  // Role 是业务数据：可以随产品迭代新增、禁用和重新分配权限。
  @Property({ length: 80 })
  code!: string;

  @Property({ length: 100 })
  name!: string;

  @Property({ type: "string", length: 500, nullable: true })
  description: string | null = null;

  @Property()
  enabled: Opt<boolean> = true;
}

@Entity({ tableName: "permissions" })
@Unique({ name: "uq_permissions_code", properties: ["code"] })
export class Permission extends SoftDeleteEntity {
  // Permission 是代码能力定义，通常由 migration 增加，不随请求动态生成。
  @Property({ length: 120 })
  code!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ length: 40 })
  group!: string;

  @Property({ type: "string", length: 500, nullable: true })
  description: string | null = null;
}

@Entity({ tableName: "user_roles" })
@Unique({ name: "uq_user_roles_pair", properties: ["userId", "roleId"] })
@Index({ name: "idx_user_roles_role", properties: ["roleId"] })
export class UserRole extends BaseEntity {
  // 因为没有 ORM relation，这里显式保存两端 UUID，由 Service 做引用检查。
  @Property({ fieldName: "user_id", type: "uuid" })
  userId!: string;

  @Property({ fieldName: "role_id", type: "uuid" })
  roleId!: string;
}

@Entity({ tableName: "role_permissions" })
@Unique({ name: "uq_role_permissions_pair", properties: ["roleId", "permissionId"] })
@Index({ name: "idx_role_permissions_permission", properties: ["permissionId"] })
export class RolePermission extends BaseEntity {
  @Property({ fieldName: "role_id", type: "uuid" })
  roleId!: string;

  @Property({ fieldName: "permission_id", type: "uuid" })
  permissionId!: string;
}
