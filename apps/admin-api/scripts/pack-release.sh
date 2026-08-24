#!/usr/bin/env bash

# 在本机构建 admin-api，并打出线上只需解压 + 安装生产依赖即可运行的压缩包。
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
pnpm build

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
echo "migration 完成后启动应用：pnpm start"
