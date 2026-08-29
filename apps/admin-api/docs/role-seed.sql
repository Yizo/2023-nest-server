-- admin-api 角色基础数据
--
-- 角色是 sys_role 业务数据，不属于 sys_dict_data。
-- data_scope 使用 role 模块 data-scope.enum.ts 中的枚举值：
-- all / department_and_children / self
-- super_admin 由 SystemInitializationModule 幂等创建，本脚本不插入超级管理员。
-- 本脚本只补充缺失的有效普通角色，不覆盖已有角色。

BEGIN;

INSERT INTO "sys_role" (
	"created_at",
	"updated_at",
	"deleted_at",
	"role_name",
	"role_code",
	"data_scope",
	"status",
	"remark"
)
VALUES
	(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, '管理员', 'admin', 'department_and_children', 1, '负责日常后台管理'),
	(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, '审计员', 'auditor', 'all', 1, '只读查看审计和管理数据'),
	(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, '普通用户', 'user', 'self', 1, '仅访问本人相关数据')
ON CONFLICT DO NOTHING;

-- 执行后可用以下结果核对有效角色。
SELECT
	"id",
	"role_name",
	"role_code",
	"data_scope",
	"status",
	"remark"
FROM "sys_role"
WHERE "deleted_at" IS NULL
	AND "role_code" IN ('admin', 'auditor', 'user')
ORDER BY "id";

COMMIT;
