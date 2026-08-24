#!/usr/bin/env bash

# 遇到未定义变量、命令失败或管道失败时立即停止脚本。
set -Eeuo pipefail

# 计算当前脚本所在目录，保证从任意工作目录执行都能定位应用文件。
SCRIPT_DIRECTORY="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# admin-api 根目录是 scripts 的上一级目录。
APP_DIRECTORY="$(cd -- "${SCRIPT_DIRECTORY}/.." && pwd)"

# 使用本应用安装的 Nest CLI，避免调用仓库中其他项目的 CLI。
NEST_BINARY="${APP_DIRECTORY}/node_modules/.bin/nest"

# 依赖没有安装时给出明确提示。
if [[ ! -x "${NEST_BINARY}" ]]; then
	echo "未找到 Nest CLI，请先在仓库根目录执行：pnpm install" >&2
	exit 1
fi

# 保存 watch 进程 PID，关闭时只清理本次启动的进程树。
WATCH_PID=""

# 防止多个终止信号同时触发重复清理。
IS_CLEANING_UP=0

# 递归终止指定进程及其子进程，覆盖 nest watch 创建的 Node worker。
terminate_process_tree() {
	local process_id="$1"
	local child_id
	local child_ids

	# 进程已经退出时不再继续查找子进程。
	if ! kill -0 "${process_id}" 2>/dev/null; then
		return 0
	fi

	# 查询直接子进程，并先递归清理更深层的 worker。
	child_ids="$(pgrep -P "${process_id}" || true)"
	for child_id in ${child_ids}; do
		terminate_process_tree "${child_id}"
	done

	# 使用 TERM 给进程执行优雅关闭的机会。
	kill -TERM "${process_id}" 2>/dev/null || true
}

# 处理 Ctrl+C、终端关闭和脚本退出事件。
cleanup() {
	local exit_code=$?

	# 重复进入清理逻辑时直接返回，避免递归触发 trap。
	if (( IS_CLEANING_UP == 1 )); then
		exit "${exit_code}"
	fi

	# 标记清理状态并暂时移除 trap，避免 kill/wait 再次触发自身。
	IS_CLEANING_UP=1
	trap - EXIT INT TERM HUP

	# 仅终止当前 start:dev 创建的 nest watch 进程树。
	if [[ -n "${WATCH_PID}" ]]; then
		terminate_process_tree "${WATCH_PID}"
		wait "${WATCH_PID}" 2>/dev/null || true
	fi

	# 保留原始退出码，便于 IDE 和终端识别启动是否异常。
	exit "${exit_code}"
}

# 监听正常退出、Ctrl+C、终止信号和终端关闭信号。
trap cleanup EXIT INT TERM HUP

# 以前台子进程运行 Nest watch，保证脚本可以管理它的生命周期。
"${NEST_BINARY}" start --watch &
WATCH_PID=$!

# 等待 Nest watch 退出；退出原因由 cleanup 统一处理。
wait "${WATCH_PID}"
