/** 通过认证后挂在 HTTP 请求上的当前用户。 */
export interface AuthenticatedUser {
	id: number;
	userName: string;
}

/** JWT 中用于区分 Access Token 和 Refresh Token 的载荷。 */
export interface AuthTokenPayload {
	sub: number;
	userName: string;
	tokenType: "access" | "refresh";
	jti: string;
}
