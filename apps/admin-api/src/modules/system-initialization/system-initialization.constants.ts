import { DataScope, SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";

/** 系统初始化维护的超级管理员目标数据。 */
export const SUPER_ADMIN_ROLE = {
	roleCode: SUPER_ADMIN_ROLE_CODE,
	roleName: "超级管理员",
	dataScope: DataScope.ALL,
	status: 1,
	remark: "系统初始化角色",
} as const;
