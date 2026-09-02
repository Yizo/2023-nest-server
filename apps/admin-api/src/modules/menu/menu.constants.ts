/** 菜单项类型。 */
export enum MenuType {
	/** 具体业务页面，通常对应一个前端组件。 */
	PAGE = "page",
	/** 只负责组织菜单层级。 */
	MENU = "menu",
	/** 打开外部地址的菜单项。 */
	EXTERNAL = "external",
	/** 页面上的操作权限。 */
	ACTION = "action",
}
