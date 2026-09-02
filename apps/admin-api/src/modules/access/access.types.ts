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
