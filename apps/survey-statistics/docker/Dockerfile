# ==========================================
# Stage 1: 依赖安装
# ==========================================
FROM node:20-alpine AS dependencies

WORKDIR /workspace

# 安装 pnpm
RUN npm install -g pnpm

# 复制 workspace 配置和 package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/commons/package.json ./packages/commons/
COPY packages/utils/package.json ./packages/utils/
COPY apps/survey-statistics/package.json ./apps/survey-statistics/

# 安装依赖（包括共享包）
RUN pnpm install --frozen-lockfile

# ==========================================
# Stage 2: 构建
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /workspace

# 从依赖阶段复制 node_modules
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/package.json ./

# 复制源代码
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY packages ./packages
COPY apps/survey-statistics ./apps/survey-statistics

# 安装 pnpm 和构建工具
RUN npm install -g pnpm

# 构建应用（包含配置文件复制）
RUN pnpm install && \
    pnpm build:commons && \
    pnpm build:utils && \
    pnpm nest build survey-statistics

# ==========================================
# Stage 3: 生产运行
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pm2
RUN npm install -g pm2

# 从构建阶段复制必要文件
COPY --from=builder /workspace/dist ./dist
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/package.json ./
COPY --from=builder /workspace/apps/survey-statistics/pm2.config.ts ./

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3003

# 暴露端口
EXPOSE 3003

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/apps/survey-statistics/src/main.js"]
