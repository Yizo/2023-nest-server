export const ROLES_KEY = 'roles';

export enum RoleStatus {
  Disabled = 0,
  Enabled = 1,
}

export enum RoleType {
  User = 0, // 普通用户
  Admin = 1, // 管理员
  SuperAdmin = 99, // 超级管理员
}
