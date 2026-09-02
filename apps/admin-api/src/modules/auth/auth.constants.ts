/** JWT 载荷中的 token 类型。 */
export const ACCESS_TOKEN_TYPE = "access" as const;
export const REFRESH_TOKEN_TYPE = "refresh" as const;

/** Redis 中保存 Refresh Token 会话的键前缀。 */
export const REFRESH_TOKEN_KEY_PREFIX = "auth:refresh";
export const REFRESH_TOKEN_USER_KEY_PREFIX = "auth:refresh:user";
