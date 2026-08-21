/** 只保留前端必须单独处理的认证业务码。 */
export enum AuthErrorCode {
  ACCESS_TOKEN_MISSING = 1001,
  ACCESS_TOKEN_EXPIRED = 1002,
  ACCESS_TOKEN_INVALID = 1003,
  REFRESH_TOKEN_INVALID = 1004,
  ACCOUNT_UNAVAILABLE = 1005,
}

export const AuthErrorMessage: Record<AuthErrorCode, string> = {
  [AuthErrorCode.ACCESS_TOKEN_MISSING]: "请先登录",
  [AuthErrorCode.ACCESS_TOKEN_EXPIRED]: "登录已过期，请重新登录",
  [AuthErrorCode.ACCESS_TOKEN_INVALID]: "登录凭证无效",
  [AuthErrorCode.REFRESH_TOKEN_INVALID]: "刷新令牌无效或已过期",
  [AuthErrorCode.ACCOUNT_UNAVAILABLE]: "用户不存在或已停用",
};
