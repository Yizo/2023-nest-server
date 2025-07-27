const path = 'jwt';

export const JwtConfig = {
  SECRET: `${path}.secret`,
  EXPIRATION: `${path}.expiration`,
  REFRESH_TOKEN_EXPIRATION: `${path}.refreshTokenExpiration`,
  ENABLE: `${path}.enable`,
} as const;

export enum JwtErrorCode {
  // Token相关错误 (1000-1999)
  NO_TOKEN_PROVIDED = 1001,
  TOKEN_EXPIRED = 1002,
  TOKEN_INVALID = 1003,
  TOKEN_VERIFICATION_FAILED = 1004,
  TOKEN_VALIDATION_FAILED = 1005,
  TOKEN_MALFORMED = 1006,
  TOKEN_SIGNATURE_INVALID = 1007,
  TOKEN_ISSUER_INVALID = 1008,
  TOKEN_AUDIENCE_INVALID = 1009,
  TOKEN_NOT_BEFORE_INVALID = 1010,

  // 用户认证相关错误 (2000-2999)
  USER_NOT_FOUND = 2001,
  USER_INACTIVE = 2002,
  USER_DISABLED = 2003,
  INVALID_CREDENTIALS = 2004,
  ACCOUNT_LOCKED = 2005,

  // 权限相关错误 (3000-3999)
  INSUFFICIENT_PERMISSIONS = 3001,
  ROLE_REQUIRED = 3002,
  PERMISSION_DENIED = 3003,
}

export const JwtErrorMessages = {
  [JwtErrorCode.NO_TOKEN_PROVIDED]: '未提供访问令牌',
  [JwtErrorCode.TOKEN_EXPIRED]: '访问令牌已过期',
  [JwtErrorCode.TOKEN_INVALID]: '访问令牌无效',
  [JwtErrorCode.TOKEN_VERIFICATION_FAILED]: '访问令牌验证失败',
  [JwtErrorCode.TOKEN_VALIDATION_FAILED]: '访问令牌验证失败',
  [JwtErrorCode.TOKEN_MALFORMED]: '访问令牌格式错误',
  [JwtErrorCode.TOKEN_SIGNATURE_INVALID]: '访问令牌签名无效',
  [JwtErrorCode.TOKEN_ISSUER_INVALID]: '访问令牌发行者无效',
  [JwtErrorCode.TOKEN_AUDIENCE_INVALID]: '访问令牌受众无效',
  [JwtErrorCode.TOKEN_NOT_BEFORE_INVALID]: '访问令牌尚未生效',
  [JwtErrorCode.USER_NOT_FOUND]: '用户不存在',
  [JwtErrorCode.USER_INACTIVE]: '用户账户未激活',
  [JwtErrorCode.USER_DISABLED]: '用户账户已禁用',
  [JwtErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [JwtErrorCode.ACCOUNT_LOCKED]: '账户已被锁定',
  [JwtErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
  [JwtErrorCode.ROLE_REQUIRED]: '需要特定角色',
  [JwtErrorCode.PERMISSION_DENIED]: '访问被拒绝',
};
