import { DataScope, SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";

/** 系统初始化时要确保存在的角色。 */
export const SYSTEM_INITIALIZATION_ROLES = [
	{
		roleCode: SUPER_ADMIN_ROLE_CODE,
		roleName: "超级管理员",
		dataScope: DataScope.ALL,
		status: 1,
		remark: "系统初始化角色",
	},
	{
		roleCode: "admin",
		roleName: "管理员",
		dataScope: DataScope.DEPARTMENT_AND_CHILDREN,
		status: 1,
		remark: "负责日常后台管理",
	},
	{
		roleCode: "auditor",
		roleName: "审计员",
		dataScope: DataScope.DEPARTMENT,
		status: 1,
		remark: "只读查看审计和管理数据",
	},
	{
		roleCode: "user",
		roleName: "普通用户",
		dataScope: DataScope.SELF,
		status: 1,
		remark: "仅访问本人相关数据",
	},
] as const;

export type SystemInitializationRole = (typeof SYSTEM_INITIALIZATION_ROLES)[number];
