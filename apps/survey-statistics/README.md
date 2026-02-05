# Survey Statistics

问卷调查统计系统

## 📁 项目结构

```
survey-statistics/
├── src/
│   ├── config/              # 配置文件（会被自动复制到构建产物）
│   │   ├── config.yml
│   │   ├── config.development.yml
│   │   ├── config.production.yml
│   │   └── configuration.ts
│   ├── logs/                # 日志目录（.gitignore）
│   ├── common/              # 通用模块
│   ├── modules/             # 业务模块
│   │   ├── auth/           # 认证模块
│   │   ├── user/           # 用户模块
│   │   ├── survey/         # 问卷模块
│   │   ├── role/           # 角色模块
│   │   ├── system/         # 系统模块
│   │   └── redis/          # Redis 模块
│   └── main.ts             # 应用入口
├── docker/
│   ├── Dockerfile          # Docker 构建文件
│   └── docker-compose.yml  # Docker Compose 配置
└── test/                   # 测试文件

```

## 🚀 开发

### 本地开发

```bash
# 在项目根目录运行
pnpm survey:dev
```

### 构建

```bash
# 构建应用
pnpm survey:build

# 构建产物位置
# dist/apps/survey-statistics/src/
```

## 🐳 Docker 部署

### 方式 1: 使用应用独立的 Docker Compose

```bash
# 进入应用 docker 目录
cd apps/survey-statistics/docker

# 启动服务（包含 MySQL 和 Redis）
docker-compose up -d

# 查看日志
docker-compose logs -f survey-statistics

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 方式 2: 使用根目录的统一 Docker Compose

```bash
# 在项目根目录
docker-compose up -d survey-statistics

# 查看日志
docker-compose logs -f survey-statistics

# 停止服务
docker-compose down
```

### 单独构建 Docker 镜像

```bash
# 从项目根目录构建
docker build -t survey-statistics:latest -f apps/survey-statistics/docker/Dockerfile .

# 运行容器
docker run -d \
  --name survey-statistics \
  -p 3003:3003 \
  -e NODE_ENV=production \
  survey-statistics:latest
```

## 🔧 环境变量

在 `docker-compose.yml` 中配置或创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=production
PORT=3003

# 数据库配置
DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=survey_user
DB_PASSWORD=survey_password
DB_DATABASE=survey_db

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123456

# JWT 配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=1h
```

## 📝 配置文件说明

### Config 目录结构

配置文件位于 `src/config/`，会在构建时自动复制到产物目录：

- `config.yml` - 默认配置
- `config.development.yml` - 开发环境配置
- `config.production.yml` - 生产环境配置
- `configuration.ts` - 配置加载器

### Logs 目录

日志文件存储在 `src/logs/`，运行时自动生成。

## 🏗️ 构建产物

```
dist/apps/survey-statistics/
├── src/
│   ├── config/          # 配置文件（已复制）
│   │   ├── *.yml
│   │   └── configuration.js
│   ├── logs/            # 日志目录（.gitignore已复制）
│   ├── modules/         # 编译后的业务模块
│   └── main.js          # 应用入口
└── packages/            # 共享库（如果有依赖）
```

## 🔍 健康检查

应用提供健康检查端点：

```bash
curl http://localhost:3003/health
```

## 📊 端口

- 应用端口: `3003`
- MySQL 端口: `3306`
- Redis 端口: `6379`

## 🛠️ 故障排查

### 查看容器日志

```bash
docker logs survey-statistics-app -f
```

### 进入容器

```bash
docker exec -it survey-statistics-app sh
```

### 检查配置文件

```bash
docker exec survey-statistics-app ls -la /app/dist/apps/survey-statistics/src/config
```

## 📚 相关文档

- [NestJS 官方文档](https://docs.nestjs.com)
- [Monorepo 工作区](https://docs.nestjs.com/cli/monorepo)
