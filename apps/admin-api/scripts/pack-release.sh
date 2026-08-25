#!/usr/bin/env bash

# 在本地生成并检查 migration，再构建 admin-api，打出线上只需解压 + 安装生产依赖即可运行的压缩包。
set -Eeuo pipefail

APP_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIRECTORY="$(cd -- "${APP_DIRECTORY}/../.." && pwd)"
OUTPUT_ARCHIVE="${APP_DIRECTORY}/admin-api-release.zip"
STAGING_DIRECTORY="$(mktemp -d)"

cleanup() {
	rm -rf "${STAGING_DIRECTORY}"
}

trap cleanup EXIT

if [[ ! -f "${ROOT_DIRECTORY}/pnpm-workspace.yaml" ]]; then
	echo "未找到仓库根目录的 pnpm-workspace.yaml。" >&2
	exit 1
fi

cd "${APP_DIRECTORY}"
pnpm db:migration:create
pnpm db:migration:check
pnpm build

if [[ ! -f "${APP_DIRECTORY}/dist/main.js" ]]; then
	echo "构建产物缺少应用入口。" >&2
	exit 1
fi
if [[ ! -f "${APP_DIRECTORY}/dist/infrastructure/database/mikro-orm.config.js" ]]; then
	echo "构建产物缺少 MikroORM 配置。" >&2
	exit 1
fi
if [[ ! -f "${APP_DIRECTORY}/dist/infrastructure/database/migrations/.snapshot-admin-api.json" ]]; then
	echo "构建产物缺少 migration snapshot。" >&2
	exit 1
fi
if ! compgen -G "${APP_DIRECTORY}/dist/infrastructure/database/migrations/Migration*.js" > /dev/null; then
	echo "构建产物缺少 compiled migration。" >&2
	exit 1
fi
node -e '
	const metadata = require(process.argv[1]);
	for (const dependency of ["@mikro-orm/cli", "@mikro-orm/migrations"]) {
		if (!metadata.dependencies?.[dependency]) throw new Error(`生产依赖缺少 ${dependency}`);
	}
	for (const script of ["db:migration:up:prod", "start:prod"]) {
		if (!metadata.scripts?.[script]) throw new Error(`缺少快捷命令 ${script}`);
	}
' "${APP_DIRECTORY}/package.json"

mkdir -p "${STAGING_DIRECTORY}/apps/admin-api"
cp "${ROOT_DIRECTORY}/package.json" "${STAGING_DIRECTORY}/"
cp "${ROOT_DIRECTORY}/pnpm-workspace.yaml" "${STAGING_DIRECTORY}/"
cp "${ROOT_DIRECTORY}/pnpm-lock.yaml" "${STAGING_DIRECTORY}/"
cp "${APP_DIRECTORY}/package.json" "${STAGING_DIRECTORY}/apps/admin-api/"
cp -R "${APP_DIRECTORY}/dist" "${STAGING_DIRECTORY}/apps/admin-api/"

if [[ -f "${APP_DIRECTORY}/.env.production" ]]; then
	cp "${APP_DIRECTORY}/.env.production" "${STAGING_DIRECTORY}/apps/admin-api/"
fi

rm -f "${OUTPUT_ARCHIVE}"
(
	cd "${STAGING_DIRECTORY}"
	zip -qr "${OUTPUT_ARCHIVE}" .
)

echo "已生成 ${OUTPUT_ARCHIVE}"
echo "上传解压后在项目根执行：pnpm install --prod"
echo "执行 migration：pnpm db:migration:up:prod"
echo "migration 完成后启动应用：pnpm start:prod"
