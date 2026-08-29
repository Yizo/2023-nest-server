/** 系统初始化维护的保留角色编码；角色接口不得创建、修改或删除它。 */
export const SUPER_ADMIN_ROLE_CODE = "super_admin";

/** 角色的数据范围策略；枚举值是业务契约，不属于系统字典数据。 */
export enum DataScope {
	/** 可访问全部数据。 */
	ALL = "all",
	/** 可访问已配置的自定义数据范围。 */
	CUSTOM = "custom",
	/** 仅可访问当前部门数据。 */
	DEPARTMENT = "department",
	/** 可访问当前部门及其下级部门数据。 */
	DEPARTMENT_AND_CHILDREN = "department_and_children",
	/** 仅可访问当前用户数据。 */
	SELF = "self",
	/** 无数据权限 */
	NONE = "none",
}
