#!/usr/bin/env bash

# 遇到未定义变量、命令失败或管道失败时立即停止脚本。
set -Eeuo pipefail

# 计算当前脚本所在目录，保证从仓库根目录或其他目录执行都能找到配置文件。
SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# admin-api 根目录是 scripts 的上一级目录。
APP_DIRECTORY="$(cd -- "${SCRIPT_DIRECTORY}/.." && pwd)"

# 基础隧道配置读取 admin-api 自己的 .env，不读取仓库根目录的 .env。
ENV_FILE="${APP_DIRECTORY}/.env"

# 记录命令行或系统传入的运行环境，避免 source .env 后丢失环境选择。
REQUESTED_NODE_ENV="${NODE_ENV:-}"

# SSH 隧道只给本地开发使用，本机覆盖配置从这里读取。
LOCAL_ENV_FILE="${APP_DIRECTORY}/.env.local"

# 没有本地 .env 时给出明确提示，避免 SSH 使用空参数启动。
if [[ ! -f "${ENV_FILE}" ]]; then
	echo "未找到 ${ENV_FILE}，请先准备 apps/admin-api/.env；production 可参考 .env.production" >&2
	exit 1
fi

# 导出 .env 中的变量，让后续脚本变量和 ssh 进程都能读取配置。
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
# 如果存在 .env.local，让本地 SSH 配置覆盖 .env。
if [[ -f "${LOCAL_ENV_FILE}" ]]; then
	# shellcheck disable=SC1090
	source "${LOCAL_ENV_FILE}"
fi
set +a

# production 应用直接访问云服务器本机地址，不通过 SSH 隧道启动。
if [[ "${REQUESTED_NODE_ENV:-${NODE_ENV:-development}}" == "production" || "${NODE_ENV:-development}" == "production" ]]; then
	echo "production 环境不使用 ssh-tunnel.sh，请直接连接 127.0.0.1 服务" >&2
	exit 1
fi

# 检查必填配置项是否存在且非空。
require_value() {
	local variable_name="$1"
	local variable_value="${!variable_name:-}"
	if [[ -z "${variable_value}" ]]; then
		echo "环境变量 ${variable_name} 未配置，请检查 ${ENV_FILE}" >&2
		exit 1
	fi
}

# 检查端口为 1 到 65535 之间的十进制整数。
require_port() {
	local variable_name="$1"
	local variable_value="${!variable_name:-}"
	if [[ ! "${variable_value}" =~ ^[0-9]+$ ]] || (( variable_value < 1 || variable_value > 65535 )); then
		echo "环境变量 ${variable_name} 必须是 1 到 65535 之间的端口号" >&2
		exit 1
	fi
}

# 检查 SSH 主机和用户名这两个必填配置。
require_value "SSH_HOST"
require_value "SSH_USER"
require_value "SSH_REMOTE_POSTGRES_HOST"
require_value "SSH_REMOTE_REDIS_HOST"

# 检查 SSH 端口和本地、远程服务端口配置。
require_port "SSH_PORT"
require_port "SSH_LOCAL_POSTGRES_PORT"
require_port "SSH_REMOTE_POSTGRES_PORT"
require_port "SSH_LOCAL_REDIS_PORT"
require_port "SSH_REMOTE_REDIS_PORT"

# 为 SSH 连接准备统一的参数数组。
SSH_ARGUMENTS=(
	-N
	-T
	-p "${SSH_PORT}"
	-o "ExitOnForwardFailure=yes"
	-o "ServerAliveInterval=${SSH_SERVER_ALIVE_INTERVAL:-60}"
	-o "ServerAliveCountMax=${SSH_SERVER_ALIVE_COUNT_MAX:-3}"
	-o "StrictHostKeyChecking=${SSH_STRICT_HOST_KEY_CHECKING:-yes}"
)

# SSH_IDENTITY_FILE 留空时让 ssh 使用 ssh-agent 或默认密钥搜索规则。
if [[ -n "${SSH_IDENTITY_FILE:-}" ]]; then
	# 将以 ~/ 开头的路径展开到当前用户的 home 目录。
	SSH_IDENTITY_FILE="${SSH_IDENTITY_FILE/#\~\//$HOME/}"

	# 私钥路径配置后必须真实存在，避免 ssh 启动后才输出难以理解的错误。
	if [[ ! -f "${SSH_IDENTITY_FILE}" ]]; then
		echo "SSH 私钥文件不存在：${SSH_IDENTITY_FILE}" >&2
		exit 1
	fi

	# 将私钥文件作为 ssh 的身份认证参数传入。
	SSH_ARGUMENTS+=("-i" "${SSH_IDENTITY_FILE}")
fi

# 输出本次隧道的本地监听地址和远程转发目标，方便确认配置是否正确。
echo "正在建立 SSH 隧道：${SSH_USER}@${SSH_HOST}:${SSH_PORT}"
echo "PostgreSQL：127.0.0.1:${SSH_LOCAL_POSTGRES_PORT} -> ${SSH_REMOTE_POSTGRES_HOST}:${SSH_REMOTE_POSTGRES_PORT}"
echo "Redis：127.0.0.1:${SSH_LOCAL_REDIS_PORT} -> ${SSH_REMOTE_REDIS_HOST}:${SSH_REMOTE_REDIS_PORT}"
echo "隧道保持前台运行，按 Ctrl+C 关闭。"

# 追加 PostgreSQL 的本地到远程端口转发规则。
SSH_ARGUMENTS+=("-L" "127.0.0.1:${SSH_LOCAL_POSTGRES_PORT}:${SSH_REMOTE_POSTGRES_HOST}:${SSH_REMOTE_POSTGRES_PORT}")

# 追加 Redis 的本地到远程端口转发规则。
SSH_ARGUMENTS+=("-L" "127.0.0.1:${SSH_LOCAL_REDIS_PORT}:${SSH_REMOTE_REDIS_HOST}:${SSH_REMOTE_REDIS_PORT}")

# 最后追加远程 SSH 登录目标。
SSH_ARGUMENTS+=("${SSH_USER}@${SSH_HOST}")

# 使用 exec 让 ssh 接管当前进程，Ctrl+C 可以直接关闭隧道。
exec ssh "${SSH_ARGUMENTS[@]}"
