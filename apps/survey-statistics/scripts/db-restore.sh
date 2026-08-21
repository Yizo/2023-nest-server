#!/bin/sh
# 任意检查或恢复步骤失败都停止，禁止继续执行半恢复流程。
set -eu

# 参数一是备份文件，参数二是预先创建的新数据库连接串。
if [ "$#" -ne 2 ]; then
  echo "Usage: db-restore.sh <backup.dump> <new-target-database-url>" >&2
  exit 1
fi

# 读取命令行参数，避免从当前生产 DATABASE_URL 推断恢复目标。
DUMP_FILE="$1"
# 恢复目标必须单独传入，脚本不会覆盖源数据库。
TARGET_DATABASE_URL="$2"

# 先确认 dump 文件存在，避免后续校验输出误导。
if [ ! -f "$DUMP_FILE" ]; then
  echo "Backup file does not exist: $DUMP_FILE" >&2
  exit 1
fi

# checksum 必须和 dump 一起提供，禁止恢复未经完整性验证的文件。
CHECKSUM_FILE="$DUMP_FILE.sha256"
# 缺少 checksum 时立即拒绝恢复。
if [ ! -f "$CHECKSUM_FILE" ]; then
  echo "Checksum file does not exist: $CHECKSUM_FILE" >&2
  exit 1
fi

# 在 dump 所在目录内校验 basename，允许整个备份目录被移动。
(
  # checksum 文件中的路径相对于当前备份目录。
  cd "$(dirname "$DUMP_FILE")"
  # 校验失败会因为 set -e 直接终止。
  sha256sum -c "$(basename "$CHECKSUM_FILE")"
)
# pg_restore --list 检查 custom-format 文件是否结构可读。
pg_restore --list "$DUMP_FILE" >/dev/null
# 统计目标 public schema 的表、序列、视图和外部表对象。
OBJECT_COUNT="$(psql "$TARGET_DATABASE_URL" -Atc "
  select count(*)
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
")"
# 非空目标意味着可能会覆盖业务数据，必须拒绝。
if [ "$OBJECT_COUNT" != "0" ]; then
  echo "Target database is not empty; refusing in-place overwrite" >&2
  exit 1
fi

# 只恢复结构和数据，不恢复原环境 owner/privilege。
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$TARGET_DATABASE_URL" "$DUMP_FILE"
# 恢复后读取 migration 数量，作为最小的版本完整性检查。
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select count(*) as applied_migrations from app_migrations"
# 只有 pg_restore 和迁移计数检查都成功才输出完成。
echo "Restore completed into the new target database"
