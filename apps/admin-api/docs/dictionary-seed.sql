-- admin-api 字典基础数据
--
-- 图片明确提供了字典类型编码和展示标签，但没有提供每个字典项的 value。
-- 本文件采用以下稳定字符串作为 value：
-- permission_type: directory / menu / button / api
-- 如果业务代码使用数值编码，请在执行前替换对应 value。
-- 本脚本只补充缺失的有效记录，不覆盖已有记录。

BEGIN;

INSERT INTO "sys_dict_type" (
	"created_at",
	"updated_at",
	"deleted_at",
	"dict_name",
	"dict_type",
	"status",
	"remark"
)
VALUES
	(CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, '权限类型', 'permission_type', 1, NULL)
ON CONFLICT DO NOTHING;

WITH seed ("dict_type", "label", "value", "sort") AS (
	VALUES
		('permission_type', '目录', 'directory', 0),
		('permission_type', '菜单', 'menu', 1),
		('permission_type', '按钮', 'button', 2),
		('permission_type', '接口', 'api', 3)
)
INSERT INTO "sys_dict_data" (
	"created_at",
	"updated_at",
	"deleted_at",
	"label",
	"value",
	"sort",
	"status",
	"remark",
	"dict_type_id"
)
SELECT
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP,
	NULL,
	seed."label",
	seed."value",
	seed."sort",
	1,
	NULL,
	type_row."id"
FROM seed
JOIN "sys_dict_type" AS type_row
	ON type_row."dict_type" = seed."dict_type"
	AND type_row."deleted_at" IS NULL
WHERE NOT EXISTS (
	SELECT 1
	FROM "sys_dict_data" AS data_row
	WHERE data_row."dict_type_id" = type_row."id"
		AND data_row."value" = seed."value"
		AND data_row."deleted_at" IS NULL
)
ON CONFLICT DO NOTHING;

-- 执行前可用以下结果核对新增/已有的有效字典数据。
SELECT
	type_row."dict_type",
	type_row."dict_name",
	data_row."sort",
	data_row."label",
	data_row."value",
	data_row."status"
FROM "sys_dict_type" AS type_row
JOIN "sys_dict_data" AS data_row
	ON data_row."dict_type_id" = type_row."id"
	AND data_row."deleted_at" IS NULL
WHERE type_row."dict_type" = 'permission_type'
	AND type_row."deleted_at" IS NULL
ORDER BY type_row."dict_type", data_row."sort", data_row."id";

COMMIT;
