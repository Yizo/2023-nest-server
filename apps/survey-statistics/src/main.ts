import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { useReportBodyParsers } from "./modules/error-report/report-body.middleware";
import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { networkInterfaces } from "os";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { appConfig } from "./enums/app";
import { TOKEN_KEY } from "./enums/jwt";

/** 收集本机所有非内网回环的 IPv4 地址，用于启动日志展示局域网访问地址 */
function getLanIpv4Addresses(): string[] {
	const addresses = new Set<string>();
	for (const iface of Object.values(networkInterfaces())) {
		if (!iface) continue;
		for (const detail of iface) {
			const family = String(detail.family);
			const isIPv4 = family === "IPv4" || family === "4";
			if (isIPv4 && !detail.internal) {
				addresses.add(detail.address);
			}
		}
	}
	return [...addresses];
}

/** 根据环境构造 CORS 选项：开发回显 Origin，生产按白名单 */
function buildCorsOptions(isDevelopment: boolean, corsOrigins: string[]): CorsOptions {
	const base = {
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", TOKEN_KEY],
	};

	if (isDevelopment) {
		return {
			...base,
			// 开发环境回显请求 Origin，兼容 localhost / 局域网 IP（不可与 credentials 共用 *）
			origin: (origin, callback) => callback(null, origin ?? true),
		};
	}

	return {
		...base,
		origin: corsOrigins.length > 0 ? corsOrigins : false,
	};
}

/** 安全与请求体相关中间件：helmet 头、信任代理、请求体大小限制、CORS */
function configureSecurity(
	app: INestApplication,
	config: ConfigService,
	isDevelopment: boolean,
) {
	// 取真实客户端 IP（部署在 Nginx 等反向代理后）
	app.getHttpAdapter().getInstance().set("trust proxy", 1);

	app.use(
		helmet({
			// 开发期关闭 CSP，避免本地调试被策略拦截
			contentSecurityPolicy: isDevelopment ? false : undefined,
			// 前端 5173 访问 API 3003 时，默认 same-origin 会导致浏览器报 NotSameOrigin
			crossOriginResourcePolicy: isDevelopment ? false : undefined,
		}),
	);

	const bodyLimit = config.get<string>("security.bodyLimit") ?? "100kb";
	useReportBodyParsers(app, bodyLimit);

	const corsOrigins = config.get<string[]>("cors.origins") ?? [];
	app.enableCors(buildCorsOptions(isDevelopment, corsOrigins));
}

/** 仅开发环境挂载 Swagger 文档（路径 /api/docs） */
function setupSwagger(app: INestApplication) {
	const docConfig = new DocumentBuilder()
		.setTitle("Survey Statistics API")
		.setDescription("问卷统计平台后台接口")
		.setVersion("1.0")
		// 相对路径：Swagger 用 IP 打开时 Try it out 仍走当前主机，避免 localhost 跨域
		.addServer("/", "当前访问主机")
		.addBearerAuth(
			{ type: "http", scheme: "bearer", bearerFormat: "JWT" },
			"bearer",
		)
		.build();

	const document = SwaggerModule.createDocument(app, docConfig);
	// 全局前缀 api + path docs => 仅一层：/api/docs（勿写成 api/docs，否则变 /api/api/docs）
	SwaggerModule.setup("docs", app, document, {
		useGlobalPrefix: true,
		swaggerOptions: { persistAuthorization: true },
	});
}

/** 打印启动后的本地 / 局域网访问地址 */
function printStartupBanner(port: number, isDevelopment: boolean) {
	const lanIps = getLanIpv4Addresses();

	console.log(`%c 🚀 Server ready`, "color: red");
	console.log(`   Local:   http://localhost:${port}/api`);
	for (const ip of lanIps) {
		console.log(`   Network: http://${ip}:${port}/api`);
	}

	if (isDevelopment) {
		console.log(`   Swagger: http://localhost:${port}/api/docs`);
		for (const ip of lanIps) {
			console.log(`   Swagger: http://${ip}:${port}/api/docs`);
		}
	}
}

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: ["error", "warn", "log"],
	});
	const config = app.get(ConfigService);
	const isDevelopment = config.get<boolean>("mode.development");

	// 所有路由统一挂在 /api 前缀下
	app.setGlobalPrefix("api");

	configureSecurity(app, config, isDevelopment);

	if (isDevelopment) {
		setupSwagger(app);
	}

	// 监听 0.0.0.0 以便局域网其他设备访问
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : appConfig.port.http;
	const host = process.env.HOST ?? "0.0.0.0";
	await app.listen(port, host);

	const address = app.getHttpServer().address();
	const actualPort =
		typeof address === "object" && address ? address.port : port;
	printStartupBanner(actualPort, isDevelopment);
}

bootstrap().catch((error) => {
	console.error("Failed to bootstrap survey-statistics", error);
	process.exit(1);
});
