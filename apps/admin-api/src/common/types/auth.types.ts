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

/** 当前用户可访问的菜单树节点。 */
export interface MenuAccessNode {
	id: number;
	type: string;
	parentId: number | null;
	name: string;
	code: string | null;
	routeName: string | null;
	path: string | null;
	component: string | null;
	redirect: string | null;
	icon: string | null;
	sort: number;
	visible: boolean;
	keepAlive: boolean | null;
	children: MenuAccessNode[];
}
