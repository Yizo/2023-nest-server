import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { utilities, type WinstonModuleOptions } from "nest-winston";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "@/config/environment";
import { sanitizeLogField } from "./log-sanitizer";

function onlyLevel(level: string) {
  return winston.format((info) => info.level === level ? info : false)();
}

function sanitizeFormat() {
  return winston.format((info) => {
    for (const key of Object.keys(info)) info[key] = sanitizeLogField(key, info[key]);
    return info;
  })();
}

function rotateFile(level: "info" | "warn" | "error") {
  const dirname = join(env.logDir, level);
  mkdirSync(dirname, { recursive: true });
  return new DailyRotateFile({
    level,
    dirname,
    filename: `application-${env.processRole}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: env.logMaxSize,
    maxFiles: env.logMaxFiles,
    format: winston.format.combine(onlyLevel(level), sanitizeFormat(), winston.format.timestamp(), winston.format.json()),
  });
}

/** 创建 API、Worker 和 CLI 共用的 Winston 配置。 */
export function createWinstonOptions(): WinstonModuleOptions {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: env.logLevel,
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.timestamp(),
        utilities.format.nestLike("survey-statistics", { colors: env.nodeEnv !== "production", prettyPrint: true }),
      ),
    }),
  ];

  if (env.logFileEnabled) transports.push(rotateFile("info"), rotateFile("warn"), rotateFile("error"));

  const options: WinstonModuleOptions = {
    level: env.logLevel,
    transports,
  };

  if (env.logFileEnabled) {
    const exceptionDir = join(env.logDir, "exceptions");
    mkdirSync(exceptionDir, { recursive: true });
    const exceptionFile = new DailyRotateFile({
      dirname: exceptionDir,
      filename: `exceptions-${env.processRole}-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: env.logMaxSize,
      maxFiles: env.logMaxFiles,
      format: winston.format.combine(sanitizeFormat(), winston.format.timestamp(), winston.format.json()),
    });
    options.exceptionHandlers = [exceptionFile];
    options.rejectionHandlers = [exceptionFile];
  }

  return options;
}
