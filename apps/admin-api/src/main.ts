import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import type { AdminApiConfig } from "./config";
import { createValidationPipe } from "./common/pipes";

/** 应用启动后的统一 HTTP 配置。 */
export function configureHttpApplication(
	app: Awaited<ReturnType<typeof NestFactory.create>>,
): void {
	const configService = app.get(ConfigService);
	const config = configService.getOrThrow<AdminApiConfig>("app");

	app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
	// 同时监听 Ctrl+C、容器终止和终端/IDE 关闭时常见的 SIGHUP。
	// Nest 收到信号后会执行 OnModuleDestroy 和 OnApplicationShutdown，
	// 从而关闭 HTTP、Redis 和 MikroORM 连接并释放监听端口。
	app.enableShutdownHooks(["SIGINT", "SIGTERM", "SIGHUP"]);
	app.setGlobalPrefix("api/v1");
	app.use(helmet());
	app.enableCors({
		origin: config.cors.origins.includes("*") ? true : config.cors.origins,
		credentials: config.cors.credentials,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	});
	app.useGlobalPipes(createValidationPipe());

	if (config.swaggerEnabled) {
		const documentConfig = new DocumentBuilder()
			.setTitle(`${config.app.name} API`)
			.setDescription("admin-api 基础脚手架接口文档")
			.setVersion("1.0.0")
			.build();
		const document = SwaggerModule.createDocument(app, documentConfig);
		SwaggerModule.setup("api/v1/docs", app, document, {
			jsonDocumentUrl: "api/v1/docs-json",
			swaggerOptions: { persistAuthorization: true, docExpansion: "list" },
		});
	}
}

/** 创建已经完成全局配置的 Nest HTTP 应用，便于端到端测试复用。 */
export async function createApplication() {
	const app = await NestFactory.create(AppModule, { bufferLogs: true });
	configureHttpApplication(app);
	return app;
}

/** 正式启动 HTTP 服务。 */
async function bootstrap(): Promise<void> {
	const app = await createApplication();
	const configService = app.get(ConfigService);
	const config = configService.getOrThrow<AdminApiConfig>("app");
	await app.listen(config.app.port, "0.0.0.0");
	new Logger("Bootstrap").log(
		`${config.app.name} listening on 0.0.0.0:${config.app.port}; environment=${config.app.nodeEnv}`,
	);

	console.group("启动成功");
	console.log("应用配置", config);
	console.log("接口文档地址：", `http://localhost:${config.app.port}/api/v1/docs`);
	console.log("接口文档json地址：", `http://localhost:${config.app.port}/api/v1/docs-json`);
	console.groupEnd();
}

if (typeof require !== "undefined" && require.main === module) {
	void bootstrap().catch((error: unknown) => {
		// 启动阶段可能尚未完成 Nest 日志初始化，所以这里保留 stderr 兜底。
		process.stderr.write(
			`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
		);
		process.exitCode = 1;
	});
}
