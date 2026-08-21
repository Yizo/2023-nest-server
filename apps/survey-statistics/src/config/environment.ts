import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const envCandidates = [
  resolve(process.cwd(), "apps/survey-statistics/.env"),
  resolve(process.cwd(), ".env"),
];
const envFile = envCandidates.find((candidate) => existsSync(candidate));
// 根目录启动和进入子应用目录启动时，cwd 不同，所以依次尝试两个位置。
if (envFile) loadEnv({ path: envFile });

const workspaceRoot = process.cwd().endsWith("apps/survey-statistics")
  ? resolve(process.cwd(), "../..")
  : process.cwd();

export type ProcessRole = "all" | "api" | "worker";
export type LogLevel = "debug" | "info" | "warn" | "error";

const nodeEnv = process.env.NODE_ENV ?? "development";

function integer(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function processRole(): ProcessRole {
  const value = process.env.PROCESS_ROLE ?? "all";
  if (value !== "all" && value !== "api" && value !== "worker") {
    throw new Error("PROCESS_ROLE must be all, api, or worker");
  }
  return value;
}

function boolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function logLevel(): LogLevel {
  const value = process.env.LOG_LEVEL ?? "info";
  if (!["debug", "info", "warn", "error"].includes(value)) {
    throw new Error("LOG_LEVEL must be debug, info, warn, or error");
  }
  return value as LogLevel;
}

export const env = {
  // 统一集中读取配置，业务类不要直接访问 process.env，便于测试和部署替换。
  nodeEnv,
  processRole: processRole(),
  host: process.env.HOST ?? "0.0.0.0",
  port: integer("PORT", 3003),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/survey_statistics_greenfield",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379/11",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "development-access-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-me",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlSeconds: integer("REFRESH_TOKEN_TTL_SECONDS", 30 * 24 * 60 * 60),
  queueConcurrency: integer("QUEUE_CONCURRENCY", 2),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  swaggerEnabled: process.env.SWAGGER_ENABLED !== "false",
  logLevel: logLevel(),
  // 测试环境强制关闭文件日志，避免测试运行污染工作目录。
  logFileEnabled: nodeEnv !== "test" && boolean("LOG_FILE_ENABLED", true),
  logDir: isAbsolute(process.env.LOG_DIR ?? "")
    ? process.env.LOG_DIR!
    : resolve(workspaceRoot, process.env.LOG_DIR ?? "apps/survey-statistics/logs"),
  logMaxSize: process.env.LOG_MAX_SIZE ?? "20m",
  logMaxFiles: process.env.LOG_MAX_FILES ?? "14d",
};

export function assertProductionSecrets(): void {
  if (env.nodeEnv !== "production") return;
  for (const [name, value] of [
    ["JWT_ACCESS_SECRET", env.jwtAccessSecret],
    ["JWT_REFRESH_SECRET", env.jwtRefreshSecret],
  ] as const) {
    if (value.length < 32 || value.includes("change-me")) {
      throw new Error(`${name} must be an injected secret with at least 32 characters`);
    }
  }
}
