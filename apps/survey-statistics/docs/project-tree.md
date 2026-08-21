# 项目目录树与职责说明

这份文档描述当前全新版本的真实源码结构。`dist`、`node_modules`、日志和本地 `.env` 属于运行产物或本地环境，不纳入源码树。

## 总体目录

```text
2023-nest-server/
├── package.json                         # 根脚本；默认以 survey-statistics 为主应用
├── pnpm-workspace.yaml                  # 声明 apps/* 和 packages/* workspace
├── pnpm-lock.yaml                       # 锁定整个 workspace 的依赖版本
├── nest-cli.json                        # Nest workspace：主应用 + commons + utils
├── nest-cli.json.md                     # nest-cli.json 的配置说明文档
├── tsconfig.json                        # 根 TypeScript 基础配置，公共库继承它
├── tsconfig.build.json                  # 根构建时排除测试文件
├── .gitignore                           # 忽略构建产物、依赖和本地环境文件
├── DEPLOYMENT.md                        # 仓库级部署说明
├── README.md                            # 仓库级说明
│
├── apps/
│   ├── survey-statistics/               # 当前主应用：问卷统计系统
│   └── nest-admin/                      # 历史应用；当前全新版本不作为主入口
│
├── packages/
│   ├── commons/                         # 公共库，供其他应用复用
│   └── utils/                           # 通用工具库
│
└── docker-compose.yml                   # 根目录历史 Compose 文件
```

## survey-statistics 应用目录

```text
apps/survey-statistics/
├── package.json                         # 应用依赖、开发命令和数据库/队列运维命令
├── nest-cli.json                        # 应用自己的 Nest CLI 配置
├── tsconfig.json                        # NodeNext、paths、严格类型检查
├── tsconfig.app.json                    # 应用开发编译入口
├── tsconfig.build.json                  # 生产构建配置，排除 test 和配置文件
├── mikro-orm.config.ts                  # MikroORM CLI 配置入口
├── .env.example                         # 本地环境变量模板，不含真实密钥
├── .env                                 # 本机开发环境，已被 Git 忽略
├── .dockerignore                        # Docker build context 排除项
├── .gitignore                           # 应用内部日志和本地文件排除项
├── README.md                            # 应用启动、部署和运维说明
│
├── docker/
│   ├── Dockerfile                       # Node 24 多阶段生产镜像
│   └── docker-compose.yml               # API、Worker、PostgreSQL、Redis 和工具容器
│
├── docs/
│   ├── architecture.md                 # ORM、模块边界、队列和错误响应决策
│   ├── database-lifecycle.md            # 初始化、迁移、发布、回滚和恢复流程
│   ├── code-reading-guide.md            # 面向学习者的代码阅读顺序
│   ├── error-codes.md                   # HTTP 状态码与少量认证业务码
│   ├── frontend-api-migration.md        # 2025-react 前端接口迁移说明
│   ├── logging.md                       # Winston 控制台、滚动文件与脱敏规则
│   └── project-tree.md                  # 本文件：目录树和文件职责
│
├── scripts/
│   ├── db-backup.sh                     # pg_dump 备份、manifest 和 SHA-256 校验
│   ├── db-restore.sh                    # 校验备份并恢复到全新空数据库
│   └── register-runtime-alias.cjs       # 运行时解析编译产物中的 @/* 别名
│
├── src/
│   ├── main.ts                          # API/Worker 进程入口和全局 Nest 配置
│   ├── app.module.ts                    # API 根模块和全局 Guard/Interceptor/Filter
│   ├── worker.module.ts                 # Worker 根模块，不监听 HTTP
│   │
│   ├── common/                          # 按 Nest 请求链组织的跨模块基础能力
│   │   ├── decorators/                  # @Public、@RequirePermissions、@CurrentUser
│   │   ├── errors/                      # 认证业务码和业务异常类
│   │   ├── filters/                     # 全局异常过滤器
│   │   ├── interceptors/                # 成功响应包装和 HTTP 访问日志
│   │   ├── logger/                      # nest-winston、滚动文件和日志脱敏
│   │   ├── middleware/                  # x-request-id 中间件
│   │   ├── pagination/                  # 页码分页、下一页标记和结果类型
│   │   ├── pipes/                       # 中文参数校验管道
│   │   ├── types/                       # request.user 和 JWT 类型
│   │   └── utils/                       # UUIDv7 等无状态工具
│   │
│   ├── config/
│   │   └── environment.ts               # dotenv 加载、环境变量解析和生产密钥校验
│   │
│   ├── database/                        # 数据库基础设施和实体
│   │   ├── base.entity.ts               # UUID、时间字段和软删除基类
│   │   ├── database-operations.module.ts# 数据库巡检等运维能力
│   │   ├── integrity-audit.service.ts  # 无物理外键时的逻辑孤儿检查
│   │   ├── mikro-orm.options.ts         # 实体、Migrator、RequestContext 配置
│   │   └── entities/
│   │       ├── index.ts                 # ENTITIES 注册表，新增实体必须登记
│   │       ├── identity.entities.ts    # User、Role、Permission 和关系表
│   │       ├── system.entities.ts      # 字典、菜单和系统配置
│   │       ├── survey.entities.ts      # Survey、Question、Option、Response、Answer
│   │       └── monitoring.entities.ts  # 监控应用、错误、分组和通知
│   │
│   ├── migrations/
│   │   ├── Migration20260817000100.ts  # 初始数据库基线、权限定义和默认系统配置
│   │   └── Migration20260817000200.ts  # 用户名字段、历史数据回填和唯一约束
│   │
│   ├── infrastructure/                 # 不属于具体业务模块的基础设施
│   │   ├── redis/
│   │   │   ├── redis.module.ts         # Redis provider 注册
│   │   │   └── redis.service.ts        # Redis 连接、ping 和优雅关闭
│   │   ├── queue/
│   │   │   ├── queue.constants.ts      # 队列名和任务名
│   │   │   ├── queue-producer.module.ts# BullMQ 连接和任务生产者
│   │   │   ├── queue-consumer.module.ts# Worker 消费者模块
│   │   │   ├── background-jobs.service.ts # 幂等任务、重试和调度同步
│   │   │   └── background.processor.ts # 通知、聚合、清理、补偿和巡检执行器
│   │   └── realtime/
│   │       └── realtime-publisher.service.ts # Redis Pub/Sub 实时通知发布
│   │
│   ├── modules/                         # 业务模块，每个模块包含 Controller/Service/DTO
│   │   ├── auth/
│   │   │   ├── auth.controller.ts      # 登录、刷新和退出接口
│   │   │   ├── auth.dto.ts              # 登录和刷新输入校验
│   │   │   ├── auth.guards.ts           # JWT Guard 和权限 Guard
│   │   │   ├── auth.module.ts           # Passport/JWT/Identity 依赖组装
│   │   │   ├── auth.service.ts          # Argon2 登录、JWT 签发和 refresh rotation
│   │   │   └── jwt.strategy.ts           # JWT payload 到数据库用户的验证
│   │   ├── health/
│   │   │   ├── health.controller.ts     # live/ready 健康检查
│   │   │   └── health.module.ts         # 健康检查模块
│   │   ├── identity/
│   │   │   ├── identity.controller.ts  # 用户、角色、权限管理接口
│   │   │   ├── identity.dto.ts          # 用户/角色/权限输入校验
│   │   │   ├── identity.module.ts       # 身份模块依赖组装
│   │   │   ├── identity.queries.ts      # 用户列表分页读模型
│   │   │   ├── identity.service.ts     # 动态角色、用户和权限关系事务
│   │   │   └── authorization.service.ts # 权限判断和平台所有者绕过
│   │   ├── monitoring/
│   │   │   ├── monitoring.controller.ts# 监控应用和客户端错误接口
│   │   │   ├── monitoring.dto.ts        # 监控输入和下一页标记查询校验
│   │   │   ├── monitoring.module.ts     # 监控模块依赖组装
│   │   │   ├── monitoring.queries.ts    # 错误列表和错误分组查询
│   │   │   ├── monitoring.service.ts    # 上报去重、脱敏和聚合记录
│   │   │   ├── monitoring-maintenance.service.ts # 错误保留期清理
│   │   │   ├── sdk-error-report.controller.ts # 前端监控 SDK 的 /error-report 接口
│   │   │   └── sdk-error-report.pipe.ts # 单条/批量 SDK 载荷转换和校验
│   │   ├── notifications/
│   │   │   ├── notifications.controller.ts # 通知列表、未读数和已读接口
│   │   │   ├── notifications.module.ts  # 通知模块依赖组装
│   │   │   └── notifications.service.ts# 通知记录、下一页标记、投递和已读状态
│   │   ├── realtime/
│   │   │   ├── realtime.gateway.ts      # Socket.IO 鉴权和用户频道订阅
│   │   │   └── realtime.module.ts       # 实时通信模块
│   │   ├── survey/
│   │   │   ├── survey.controller.ts     # 问卷 CRUD、发布、关闭、提交和统计接口
│   │   │   ├── survey.dto.ts             # 问卷结构和答卷输入校验
│   │   │   ├── survey.module.ts          # 问卷模块依赖组装
│   │   │   ├── survey.queries.ts         # 列表和统计专用读 SQL
│   │   │   └── survey.service.ts         # 问卷状态机、事务和答案规则
│   │   └── system/
│   │       ├── system.controller.ts      # 字典、菜单、配置管理接口
│   │       ├── system.dto.ts             # 系统元数据输入校验
│   │       ├── system.module.ts          # 系统模块依赖组装
│   │       └── system.service.ts         # 元数据关联检查和配置“存在则更新、不存在则创建”
│   │
│   └── tools/
│       ├── cli.ts                        # migrate、bootstrap、队列和巡检 CLI
│       └── tool.module.ts                # CLI 所需的 Nest application context
│
└── test/
    ├── jest.config.ts                    # 单元测试配置
    ├── jest-e2e.config.ts                # E2E 配置和隔离环境
    ├── setup-e2e-env.ts                  # E2E 数据库、Redis、JWT 环境变量
    ├── tsconfig.json                     # Jest ESM/TypeScript 配置
    ├── unit/
    │   ├── api-exception.filter.spec.ts # 错误响应和错误码测试
    │   ├── authorization.service.spec.ts# 动态权限和平台所有者测试
    │   └── background-jobs.service.spec.ts # BullMQ 幂等 jobId 测试
    └── e2e/
        └── greenfield.e2e-spec.ts       # 迁移、RBAC、问卷、通知和监控完整链路
```

## 公共库

```text
packages/
├── commons/
│   ├── index.ts                          # 公共库统一导出
│   ├── pagination-builder.ts             # 历史 TypeORM 分页工具
│   ├── query-builder/                    # 历史 Query Builder 封装，供旧消费者使用
│   └── tsconfig.json                      # 公共库声明文件和输出目录配置
└── utils/
    ├── index.ts                          # 工具库统一导出
    ├── util.ts                           # 通用分页等工具函数
    └── tsconfig.json                      # 工具库构建配置
```

`survey-statistics` 当前不依赖 `commons/query-builder`。公共库保留在 workspace 中，未来可以提供与主应用无关的通用能力。

## 建议阅读顺序

```text
1. main.ts / app.module.ts
2. common/ 和 modules/auth/
3. modules/identity/
4. modules/survey/survey.service.ts
5. database/entities/ 和 migrations/
6. infrastructure/queue/
7. docker/、scripts/ 和 tools/cli.ts
8. test/e2e/greenfield.e2e-spec.ts
```

这条顺序对应一次真实请求从启动、鉴权、业务事务、数据库写入到异步任务的完整路径。
