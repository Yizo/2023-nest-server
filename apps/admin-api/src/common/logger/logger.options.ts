import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ConfigService } from "@nestjs/config";
import { utilities, type WinstonModuleOptions } from "nest-winston";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import type { AdminApiConfig } from "@/config";

/** 只保留指定级别，避免 info 文件同时收集 warn/error。 */
function onlyLevel(level: string): winston.Logform.Format {
	return winston.format((info) => (info.level === level ? info : false))();
}

/** 创建一个按 info/warn/error 分目录写入的每日滚动文件传输器。 */
function createLevelFile(
	config: AdminApiConfig,
	level: "info" | "warn" | "error",
): DailyRotateFile {
	const directory = join(config.logging.dir, level);
	mkdirSync(directory, { recursive: true });
	return new DailyRotateFile({
		level,
		dirname: directory,
		filename: `${config.app.name}-${level}-%DATE%.log`,
		datePattern: "YYYY-MM-DD",
		zippedArchive: true,
		maxSize: config.logging.maxSize,
		maxFiles: config.logging.maxFiles,
		format: winston.format.combine(
			onlyLevel(level),
			winston.format.errors({ stack: true }),
			winston.format.timestamp(),
			winston.format.json(),
		),
	});
}

/** Nest Logger 使用的控制台和本地文件 Winston 配置。 */
export function createWinstonOptions(configService: ConfigService): WinstonModuleOptions {
	const config = configService.getOrThrow<AdminApiConfig>("app");
	const transports: winston.transport[] = [
		new winston.transports.Console({
			level: config.logging.level,
			format: winston.format.combine(
				winston.format.errors({ stack: true }),
				winston.format.timestamp(),
				utilities.format.nestLike(config.app.name, {
					colors: config.app.nodeEnv !== "production",
					prettyPrint: true,
				}),
			),
		}),
	];

	const options: WinstonModuleOptions = {
		level: config.logging.level,
		transports,
	};

	// 自动化测试不写文件；开发和生产环境始终启用本地滚动日志。
	if (config.app.nodeEnv === "test") return options;

	transports.push(
		createLevelFile(config, "info"),
		createLevelFile(config, "warn"),
		createLevelFile(config, "error"),
	);

	const exceptionDirectory = join(config.logging.dir, "exceptions");
	mkdirSync(exceptionDirectory, { recursive: true });
	const exceptionFile = new DailyRotateFile({
		dirname: exceptionDirectory,
		filename: `${config.app.name}-exceptions-%DATE%.log`,
		datePattern: "YYYY-MM-DD",
		zippedArchive: true,
		maxSize: config.logging.maxSize,
		maxFiles: config.logging.maxFiles,
		format: winston.format.combine(
			winston.format.errors({ stack: true }),
			winston.format.timestamp(),
			winston.format.json(),
		),
	});
	options.exceptionHandlers = [exceptionFile];
	options.rejectionHandlers = [exceptionFile];
	return options;
}
