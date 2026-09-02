# admin-api 目录说明

```text
apps/admin-api/
├── .env.production          # production 非机密配置，连接串由系统环境变量注入
├── .env.local               # 本机覆盖配置，已被 Git 忽略
├── .gitignore               # 忽略本地环境、日志和编译产物
├── package.json              # 独立依赖、构建、测试和开发脚本
├── nest-cli.json             # 本应用自己的 Nest CLI 配置
├── tsconfig.json             # TypeScript 开发和测试配置
├── tsconfig.build.json       # 只编译 src 的构建配置
├── README.md                 # 启动、SSH 隧道、日志和数据库说明
├── docs/
│   └── project-tree.md       # 当前目录职责说明
├── src/
│   ├── main.ts               # 创建 Nest 应用、注册全局能力和监听端口
│   ├── app.module.ts         # 组装配置、日志、数据库、Redis 和健康模块
│   ├── app.controller.ts     # 不包含业务的最小应用信息接口
│   ├── config/               # dotenv-flow 加载环境文件并组装嵌套配置
│   ├── common/               # 跨业务复用的过滤器、拦截器、管道、中间件和守卫
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── database.module.ts # 创建和关闭 MikroORM PostgreSQL 实例
│   │   │   ├── mikro-orm.config.ts# 显式 ORM 连接配置，不管理 schema
│   │   │   └── index.ts            # 数据库基础设施导出
│   │   └── redis/                 # 只保留连接，不认识权限 key 或菜单结构
│   │       ├── redis.module.ts    # Redis 客户端 Provider 和模块导出
│   │       ├── redis.service.ts   # PING、连接错误和优雅关闭
│   │       └── redis.constants.ts # Redis 注入令牌
│   └── modules/
│       ├── access/                # 权限读模型、失效端口、PermissionGuard、GET /auth/access
│       └── health/                # live/ready 健康检查
├── scripts/
│   ├── ssh-tunnel.sh            # 从 .env 读取配置并以前台方式建立 SSH 隧道
│   └── start-dev.sh             # 启动 Nest watch 并在退出时清理整个 Node 进程树
└── test/
    ├── unit/                  # 不依赖远程 PostgreSQL/Redis 的单元测试
    └── e2e/                   # 需要真实依赖时运行的 HTTP 端到端测试
```

## 请求处理顺序

```text
RequestIdMiddleware
        ↓
MikroOrmRequestContextMiddleware
        ↓
AuthGuard
        ↓
PermissionGuard
        ↓
RequestLoggingInterceptor
        ↓
ValidationPipe
        ↓
Controller
        ↓
ResponseInterceptor
        ↓
HttpExceptionFilter
```

## 后续增加业务模块的规则

1. 业务模块放在 `src/modules/<module-name>`，不要直接堆到 `AppModule`。
2. 实体放在业务模块内，新增实体时先确认数据库结构管理方式。
3. Controller 只处理 HTTP 输入输出，数据库读写放到 Service 或 Query 类。
4. 不恢复仓库根目录的通用 Query Builder。
5. 业务路由使用 `@AuthRequired()` 或 `@RequirePermissions()`，公开路由必须显式使用 `@Public()`。未标注路由默认拒绝。
6. 跨模块只走导出端口，禁止注入他模块的 `*DataService`。
7. 写侧不自己查失效用户，只调用 `AccessInvalidation.invalidateUser/Role/Menu`。
