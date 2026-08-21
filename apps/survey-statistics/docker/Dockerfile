# 依赖阶段只安装依赖，不复制业务源码，便于 Docker 缓存复用。
FROM node:24-alpine AS dependencies

# 统一工作目录，后续所有相对路径都以这里为基准。
WORKDIR /workspace
# 启用 Corepack，让镜像使用 package.json 声明的 pnpm 版本。
RUN corepack enable

# 先复制锁文件和 workspace 清单，依赖没有变化时可以命中缓存。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# 只复制 survey-statistics 的 package.json，避免源码变化触发依赖重装。
COPY apps/survey-statistics/package.json ./apps/survey-statistics/package.json
# frozen-lockfile 保证镜像不会偷偷解析出另一套依赖版本。
RUN pnpm install --filter survey-statistics... --frozen-lockfile

# 构建阶段使用同样的 Node 版本编译 TypeScript。
FROM node:24-alpine AS builder

# 构建阶段继续使用 workspace 根目录。
WORKDIR /workspace
# Corepack 在每个阶段都需要单独启用。
RUN corepack enable
# 复用依赖阶段的根 node_modules。
COPY --from=dependencies /workspace/node_modules ./node_modules
# 复用 survey 应用自己的 node_modules 链接。
COPY --from=dependencies /workspace/apps/survey-statistics/node_modules ./apps/survey-statistics/node_modules
# 复制根 workspace 文件，保证 pnpm filter 能识别项目。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# 复制 survey 源码、迁移、脚本和配置。
COPY apps/survey-statistics ./apps/survey-statistics
# 只构建目标应用，不构建无关 workspace 项目。
RUN pnpm --filter survey-statistics build

# 运行阶段只保留运行所需文件，降低镜像体积和攻击面。
FROM node:24-alpine AS runtime

# 运行时仍以 workspace 根为当前目录，匹配 dist 路径。
WORKDIR /workspace
# pg client 用于容器内执行备份、恢复和数据库运维脚本。
RUN corepack enable && apk add --no-cache postgresql-client
# 创建日志目录并交给 node 用户，保证运行时可以写滚动日志。
RUN mkdir -p /workspace/apps/survey-statistics/logs && chown -R node:node /workspace/apps/survey-statistics/logs
# 复制运行时依赖。
COPY --from=builder /workspace/node_modules ./node_modules
# 复制应用依赖链接。
COPY --from=builder /workspace/apps/survey-statistics/node_modules ./apps/survey-statistics/node_modules
# 只复制编译产物，不把 TypeScript 源码带进运行镜像。
COPY --from=builder /workspace/apps/survey-statistics/dist ./apps/survey-statistics/dist
# 备份、恢复和 runtime alias 注册脚本仍需要保留。
COPY --from=builder /workspace/apps/survey-statistics/scripts ./apps/survey-statistics/scripts
# CLI 运行时需要知道应用的 package metadata。
COPY --from=builder /workspace/apps/survey-statistics/package.json ./apps/survey-statistics/package.json

# 生产模式会启用生产密钥校验。
ENV NODE_ENV=production
# API 默认监听容器内 3003 端口。
ENV PORT=3003
# 声明容器端口，实际映射由 Compose 或平台配置决定。
EXPOSE 3003

# 不使用 root 用户运行应用。
USER node
# 预加载 @/* 运行时别名，再启动编译后的主程序。
CMD ["node", "-r", "apps/survey-statistics/scripts/register-runtime-alias.cjs", "apps/survey-statistics/dist/main.js"]
