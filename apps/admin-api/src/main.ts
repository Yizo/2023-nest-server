import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { networkInterfaces } from "node:os";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import type { AdminApiConfig } from "./config";
import { createValidationPipe } from "./common/pipes";

/** 监听 0.0.0.0 时列出本机可访问的 IPv4 源，便于打印真实文档地址。 */
function advertisedHttpOrigins(port: number): string[] {
	const hosts = new Set<string>(["127.0.0.1"]);
	for (const addresses of Object.values(networkInterfaces())) {
		for (const address of addresses ?? []) {
			if (address.family !== "IPv4") continue;
			if (address.internal) continue;
			hosts.add(address.address);
		}
	}
	return [...hosts].map((host) => `http://${host}:${port}`);
}

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
	const isDevelopment = config.app.nodeEnv === "development";
	app.use(
		helmet({
			// HTTP 下用 IP（非 localhost）访问时，浏览器会忽略 COOP 并打这条警告。
			crossOriginOpenerPolicy: isDevelopment ? false : { policy: "same-origin" },
			// 开发环境关闭默认 CSP，避免 Swagger UI 的内联脚本被拦截。
			contentSecurityPolicy: isDevelopment ? false : undefined,
		}),
	);
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
			.setVersion(config.app.version)
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
	let app: Awaited<ReturnType<typeof createApplication>> | undefined;
	try {
		app = await createApplication();
		const configService = app.get(ConfigService);
		const config = configService.getOrThrow<AdminApiConfig>("app");
		await app.listen(config.app.port, "0.0.0.0");
		new Logger("Bootstrap").log(
			`${config.app.name}@${config.app.version} listening on 0.0.0.0:${config.app.port}; environment=${config.app.nodeEnv}`,
		);
		console.group("admin-api启动成功");
		console.log("config", config);
		if (config.swaggerEnabled) {
			const origins = advertisedHttpOrigins(config.app.port);
			console.log(
				"swagger文档地址",
				origins.map((origin) => `${origin}/api/v1/docs`),
			);
			console.log(
				"swagger文档JSON地址",
				origins.map((origin) => `${origin}/api/v1/docs-json`),
			);
		}
		console.groupEnd();
	} catch (error) {
		if (app) await app.close().catch(() => undefined);
		throw error;
	}
}

if (typeof require !== "undefined" && require.main === module) {
	void bootstrap().catch((error: unknown) => {
		// 启动阶段可能尚未完成 Nest 日志初始化，所以这里保留 stderr 兜底。
		const message = error instanceof Error ? error.message : "未知错误";
		process.stderr.write(`应用启动失败：${message}\n`);
		process.exitCode = 1;
	});
}
