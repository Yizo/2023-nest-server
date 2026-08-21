import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { WorkerModule } from "./worker.module";
import { assertProductionSecrets, env } from "./config/environment";
import { createValidationPipe } from "./common/pipes/validation.pipe";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

/**
 * API 进程的入口。
 *
 * 这里只负责“组装 Nest 应用”和“注册全局能力”，不负责迁移数据库、
 * 创建角色或写入默认业务数据。初始化属于部署阶段的显式命令。
 */
async function startApi(): Promise<void> {
	const app = await NestFactory.create(AppModule, { bufferLogs: true });
	// 把 Nest 系统日志和业务 Logger 统一切换到 Winston。
	app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
	app.flushLogs();
	app.enableShutdownHooks();
	// 所有 HTTP 接口统一挂在版本前缀下，未来可以并行保留 v2。
	app.setGlobalPrefix("api");
	app.use(helmet());
	app.enableCors({
		origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
		credentials: true,
		methods: ["GET", "POST", "OPTIONS"],
	});
	// 全局校验只返回第一条中文提示，并阻止 DTO 未声明字段进入业务层。
	app.useGlobalPipes(createValidationPipe());

	if (env.swaggerEnabled) {
		const config = new DocumentBuilder()
			.setTitle("问卷统计系统 API")
			.setDescription(
				"问卷统计系统 HTTP 接口。成功响应统一为 `{ code: 0, message: \"成功\", data, requestId, timestamp }`；分页列表的 `data` 为 `{ items, page, pageSize, total }`。需要登录的接口请先调用 `/api/auth/login`，再使用返回的 access token。",
			)
			.setVersion("1.0")
			.addTag("认证", "登录、刷新令牌、登出")
			.addTag("身份与权限", "用户、角色、权限")
			.addTag("问卷", "问卷创建、发布、答卷与统计")
			.addTag("监控", "监控应用与客户端错误")
			.addTag("监控 SDK", "前端 SDK 错误上报")
			.addTag("系统", "字典、菜单、系统配置")
			.addTag("通知", "站内通知")
			.addTag("健康检查", "存活与就绪探测")
			.addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT", description: "登录后获得的 Access Token" }, "bearer")
			.build();
		SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config), {
			jsonDocumentUrl: "api/docs-json",
			yamlDocumentUrl: "api/docs-yaml",
			swaggerOptions: { persistAuthorization: true, docExpansion: "list" },
		});
	}

	await app.listen(env.port, env.host);
	Logger.log(
		`survey-statistics API listening on ${env.host}:${env.port}; role=${env.processRole}`,
		"Bootstrap",
	);
}

async function startWorker(): Promise<void> {
	// Worker 不监听 HTTP 端口，只消费 BullMQ 队列。
	const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
	app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
	app.flushLogs();
	app.enableShutdownHooks();
	Logger.log(
		`survey-statistics worker started; concurrency=${env.queueConcurrency}`,
		"Bootstrap",
	);
}

async function bootstrap(): Promise<void> {
	// 生产环境先检查密钥，避免服务带着开发默认值上线。
	assertProductionSecrets();
	if (env.processRole === "worker") await startWorker();
	else await startApi();
}

void bootstrap().catch((error) => {
	Logger.error(error instanceof Error ? error.stack : String(error), undefined, "Bootstrap");
	process.exitCode = 1;
});
