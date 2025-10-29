export enum PermissionType {
  Menu = 1, // 菜单权限
  Button = 2, // 按钮权限
  API = 3, // API权限
  Data = 4, // 数据权限
  All = 99, // 所有权限
}

export enum PermissionAction {
  Manage = 'manage', // 管理权限（包含所有操作）
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export const PERMISSIONS_KEY = 'permissions';

export const SUBJECT_CONFIG = {
  USER: 'User',
  ROLE: 'Role',
  PERMISSION: 'Permission',
} as const;

export type SubjectKeys = keyof typeof SUBJECT_CONFIG;
export type Subjects = (typeof SUBJECT_CONFIG)[SubjectKeys] | 'all';
