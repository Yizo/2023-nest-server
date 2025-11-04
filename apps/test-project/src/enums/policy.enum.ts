export enum PolicyEffect {
  Can = 'can',
  Cannot = 'cannot',
}

export enum PolicyAction {
  Manage = 'manage', // 管理权限（包含所有操作）
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  // 审批权限
  Approve = 'approve',
}
