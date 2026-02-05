# 🚀 Monorepo 部署指南

本文档说明如何部署 NestJS Monorepo 项目中的各个应用。

## 📦 构建产物结构

```
dist/
├── apps/
│   └── survey-statistics/
│       └── src/
│           ├── config/              # ✅ yml 配置文件已复制
│           │   ├── config.yml
│           │   ├── config.development.yml
│           │   ├── config.production.yml
│           │   ├── configuration.js
│           │   └── configuration.js.map
│           ├── logs/                # ✅ .gitignore 已复制
│           │   └── .gitignore
│           ├── modules/             # 业务模块
│           └── main.js              # 入口文件
└── packages/                        # 共享库
```

## 🐳 Docker 部署方式

### 方式 1: 使用根目录统一部署（推荐用于开发）

适合本地开发和集成测试，可以同时启动多个应用和基础服务。

```bash
# 启动 survey-statistics 和所有依赖服务
docker-compose up -d

# 只启动 survey-statistics
docker-compose up -d survey-statistics

# 查看日志
docker-compose logs -f survey-statistics

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build survey-statistics
```

### 方式 2: 使用应用独立部署（推荐用于生产）

适合独立部署单个应用到生产环境。

```bash
# 进入应用的 docker 目录
cd apps/survey-statistics/docker

# 启动服务（包含 MySQL 和 Redis）
docker-compose up -d

# 查看日志
docker-compose logs -f survey-statistics

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 方式 3: 手动构建镜像（用于 CI/CD）

```bash
# 从项目根目录构建镜像
docker build -t survey-statistics:1.0.0 \
  -f apps/survey-statistics/docker/Dockerfile .

# 推送到镜像仓库
docker tag survey-statistics:1.0.0 your-registry/survey-statistics:1.0.0
docker push your-registry/survey-statistics:1.0.0

# 在生产环境运行
docker run -d \
  --name survey-statistics \
  -p 3003:3003 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e REDIS_HOST=your-redis-host \
  -v /var/logs:/app/dist/apps/survey-statistics/src/logs \
  your-registry/survey-statistics:1.0.0
```

## 🔧 环境变量配置

### 开发环境

配置文件：`apps/survey-statistics/src/config/config.development.yml`

### 生产环境

**方式 1: 使用配置文件**

-   修改：`apps/survey-statistics/src/config/config.production.yml`
-   重新构建镜像

**方式 2: 使用环境变量（推荐）**

在 `docker-compose.yml` 中配置或使用 `.env` 文件：

```yaml
environment:
    - NODE_ENV=production
    - PORT=3003
    - DB_TYPE=mysql
    - DB_HOST=your-db-host
    - DB_PORT=3306
    - DB_USERNAME=your-username
    - DB_PASSWORD=your-password
    - DB_DATABASE=survey_db
    - REDIS_HOST=your-redis-host
    - REDIS_PORT=6379
    - REDIS_PASSWORD=your-redis-password
    - JWT_SECRET=your-jwt-secret
    - JWT_EXPIRATION=1h
```

## 🔍 健康检查

应用包含健康检查功能：

```bash
# 检查应用是否正常运行
curl http://localhost:3003/health

# Docker 自动健康检查
# 在 Dockerfile 中已配置，会自动监控应用状态
```

## 📊 日志管理

### 日志位置

-   **容器内**: `/app/dist/apps/survey-statistics/src/logs/`
-   **宿主机**: 通过 volume 映射

### 挂载日志目录

在 `docker-compose.yml` 中已配置：

```yaml
volumes:
    - ./logs:/app/dist/apps/survey-statistics/src/logs
```

查看日志：

```bash
# 查看容器日志
docker logs survey-statistics-app -f

# 查看应用日志（如果挂载了）
tail -f apps/survey-statistics/logs/*.log
```

## 🛠️ 故障排查

### 1. 配置文件找不到

检查配置文件是否正确复制到构建产物：

```bash
# 检查本地构建产物
ls -la dist/apps/survey-statistics/src/config/

# 检查容器内文件
docker exec survey-statistics-app \
  ls -la /app/dist/apps/survey-statistics/src/config/
```

### 2. 数据库连接失败

检查环境变量和网络连接：

```bash
# 查看容器环境变量
docker exec survey-statistics-app env | grep DB_

# 测试数据库连接
docker exec survey-statistics-app \
  ping mysql -c 3
```

### 3. 应用启动失败

查看详细日志：

```bash
# 查看容器启动日志
docker logs survey-statistics-app --tail=100

# 进入容器排查
docker exec -it survey-statistics-app sh
cd /app
ls -la dist/apps/survey-statistics/src/
```

### 4. 端口冲突

修改端口映射：

```yaml
ports:
    - "13003:3003" # 宿主机:容器
```

## 📚 相关命令速查

### 开发命令

```bash
# 开发模式（热重载）
pnpm survey:dev

# 调试模式
pnpm survey:debug

# 构建
pnpm survey:build

# 运行生产版本
pnpm survey:start
```

### Docker 命令

```bash
# 构建镜像
docker-compose build survey-statistics

# 启动服务
docker-compose up -d survey-statistics

# 重启服务
docker-compose restart survey-statistics

# 查看日志
docker-compose logs -f survey-statistics

# 停止服务
docker-compose stop survey-statistics

# 删除服务
docker-compose down survey-statistics

# 完全清理（包括数据卷）
docker-compose down -v
```

## 🚀 CI/CD 建议

### GitLab CI 示例

```yaml
build:
    stage: build
    script:
        - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
          -f apps/survey-statistics/docker/Dockerfile .
        - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
    stage: deploy
    script:
        - docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        - docker stop survey-statistics || true
        - docker rm survey-statistics || true
        - docker run -d --name survey-statistics \
          -p 3003:3003 \
          --env-file .env.production \
          $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## 📖 更多信息

-   应用文档: `apps/survey-statistics/README.md`
-   NestJS Monorepo: https://docs.nestjs.com/cli/monorepo
-   Docker Compose: https://docs.docker.com/compose/
