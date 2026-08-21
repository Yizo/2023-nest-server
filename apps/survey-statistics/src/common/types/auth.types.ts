// 这些接口描述 request.user 和 JWT payload 的最小字段，避免业务层依赖 Passport 的宽泛 any。
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isPlatformOwner: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  email: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}
