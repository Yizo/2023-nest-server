# 日志系统

当前使用 `nest-winston + winston + winston-daily-rotate-file`，Nest 系统日志和业务日志共用同一个全局 Logger。

## 输出通道

```text
Nest / 业务日志
├── stdout/stderr：本地终端、docker logs、日志采集平台
└── 本地滚动文件：短期排障和单机部署
```

文件目录：

```text
logs/
├── info/application-{processRole}-YYYY-MM-DD.log
├── warn/application-{processRole}-YYYY-MM-DD.log
├── error/application-{processRole}-YYYY-MM-DD.log
└── exceptions/exceptions-{processRole}-YYYY-MM-DD.log
```

`processRole` 为 `all`、`api` 或 `worker`，拆分部署时不会让 API 和 Worker 写入同一个文件。

## 环境变量

```env
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_DIR=apps/survey-statistics/logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d
```

- 控制台日志始终启用。
- 测试环境强制关闭文件日志。
- Docker 使用 `application_logs` volume 持久化文件。
- 日志按日期、大小和保留周期自动滚动。

## 安全规则

日志模块递归清理以下字段：

```text
password
token
authorization
cookie
secret
apiKey
```

JWT、Bearer Token 和 PostgreSQL URL 密码也会替换为 `[REDACTED]`。HTTP 日志不记录完整请求体和请求头，只记录 requestId、方法、路径、状态码、用户 ID、IP 和耗时。
