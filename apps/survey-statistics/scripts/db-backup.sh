#!/bin/sh
# 任意命令失败立即退出，避免生成看起来成功但内容不完整的备份。
set -eu

# 备份必须明确知道目标数据库，禁止无意中备份默认库。
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

# BACKUP_DIR 可由本地命令或 Compose volume 注入。
BACKUP_DIR="${BACKUP_DIR:-/backups}"
# 目录不存在时创建；生产环境通常对应持久化 volume。
mkdir -p "$BACKUP_DIR"
# 备份文件包含数据库内容，创建前禁止其他用户读取新文件。
umask 077
# 使用 UTC 时间生成可排序且不依赖时区的文件名。
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
# custom format 支持 pg_restore 选择性恢复和列表检查。
DUMP_FILE="$BACKUP_DIR/survey-statistics-$TIMESTAMP.dump"

# 不保存 owner/privilege，恢复到新环境时不会依赖原数据库角色。
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$DUMP_FILE"
# 读取 dump 目录，确认文件结构可被 pg_restore 识别。
pg_restore --list "$DUMP_FILE" > "$DUMP_FILE.manifest"
# checksum 文件只保存 basename，备份目录移动后仍然可以校验。
(
  # 在备份目录内运行，让 checksum 文件引用相对路径。
  cd "$BACKUP_DIR"
  # SHA-256 用于传输后确认 dump 没有被截断或篡改。
  sha256sum "$(basename "$DUMP_FILE")" > "$(basename "$DUMP_FILE").sha256"
)

# 只有 dump、manifest、checksum 都成功生成后才打印成功信息。
echo "Backup created and verified: $DUMP_FILE"
