import { config as loadDotenvFlow } from "dotenv-flow";
import packageMetadata from "../../package.json";

/** 应用允许的运行环境名称。 */
export type NodeEnvironment = "development" | "test" | "production";

/** 所有模块继续消费的统一嵌套配置对象。 */
export interface AdminApiConfig {
	app: {
		name: string;
		nodeEnv: string;
		port: number;
		version: string;
	};
	database: {
		url: string;
		synchronize: boolean;
		debug: boolean;
	};
	redis: {
		url: string;
	};
	cors: {
		origins: string[];
		credentials: boolean;
	};
	swaggerEnabled: boolean;
	logging: {
		level: string;
		dir: string;
		maxSize: string;
		maxFiles: string;
	};
}

export const ADMIN_API_VERSION = packageMetadata.version;

/**
 * 返回当前 mode 要加载的文件名，顺序由低优先级到高优先级排列。
 *
 * production 明确不加载任何 local 文件；开发和测试保留 Vite 风格的
 * .env、.env.local、.env.[mode]、.env.[mode].local 层级。
 */
export function environmentFilesForMode(mode: string): string[] {
	if (mode === "production") return [".env", ".env.production"];
	return [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
}

// dotenv-flow 以当前应用工作目录为配置目录，系统环境变量优先于文件值。
const currentMode = process.env.NODE_ENV ?? "development";
const environmentResult = loadDotenvFlow({
	path: process.cwd(),
	files: environmentFilesForMode(currentMode),
	silent: true,
});
if (environmentResult.error) throw environmentResult.error;

/** 将已经加载的 process.env 直接整理成模块统一消费的嵌套对象。 */
export function createConfiguration(raw: NodeJS.ProcessEnv = process.env): AdminApiConfig {
	const nodeEnv = raw.NODE_ENV || currentMode;
	return {
		app: {
			name: raw.APP_NAME || "admin-api",
			nodeEnv,
			port: Number(raw.PORT || "3004"),
			version: ADMIN_API_VERSION,
		},
		database: {
			// production 为空时保留空字符串，让 MikroORM 在运行时报告错误。
			url: raw.DATABASE_URL || "",
			// production 强制关闭；其它环境可显式覆盖，development 默认开启。
			synchronize: nodeEnv !== "production"
				&& (raw.DATABASE_SYNCHRONIZE
					? raw.DATABASE_SYNCHRONIZE === "true"
					: nodeEnv === "development"),
			debug: raw.DB_DEBUG === "true",
		},
		redis: {
			// production 为空时保留空字符串，让 node-redis 在运行时报告错误。
			url: raw.REDIS_URL || "",
		},
		cors: {
			origins: (raw.CORS_ORIGINS || "http://localhost:5173")
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
			credentials: raw.CORS_CREDENTIALS === "true",
		},
		swaggerEnabled: raw.SWAGGER_ENABLED !== "false",
		logging: {
			level: raw.LOG_LEVEL || "info",
			dir: raw.LOG_DIR || "logs",
			maxSize: raw.LOG_MAX_SIZE || "20m",
			maxFiles: raw.LOG_MAX_FILES || "14d",
		},
	};
}
