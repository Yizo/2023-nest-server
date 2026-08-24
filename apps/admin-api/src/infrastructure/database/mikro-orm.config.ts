import { Migrator } from "@mikro-orm/migrations";
import { defineConfig, PostgreSqlDriver, type Options } from "@mikro-orm/postgresql";
import { Logger } from "@nestjs/common";
import { join } from "node:path";
import { createConfiguration, type AdminApiConfig } from "../../config";

const mikroOrmLogger = new Logger("MikroORM");

/**
 * Nest 运行时、MikroORM CLI 和生产迁移共用同一份数据库配置。
 *
 * snapshot 只在 `migration:create` 时打开：生成器需要把当前实体结构写入快照，
 * HTTP 进程执行迁移时关闭，避免运行期改写快照文件。
 */
export function createMikroOrmOptions(config: AdminApiConfig, snapshot = false): Options {
	return defineConfig({
		// PostgreSQL 驱动；clientUrl 来自环境变量 DATABASE_URL。
		driver: PostgreSqlDriver,
		clientUrl: config.database.url,
		// 数据库 schema
		schema: "public",
		// 实体稍后以 class 引用显式注册；空数组时关闭“无实体”警告，避免脚手架阶段刷屏。
		entities: [],
		discovery: { warnWhenNoEntities: false },
		// 禁止在请求上下文外使用全局 EntityManager，强制走每请求 fork，避免并发 Identity Map 串扰。
		allowGlobalContext: false,
		// 普通连接不修改数据库；开发环境是否自动更新结构由 database.synchronize 控制。
		ensureDatabase: false,
		ensureIndexes: false,
		// 默认关闭 SQL 日志；开发环境显式设置 DB_DEBUG=true 才打印。
		debug: config.app.nodeEnv === "development" && config.database.debug,
		colors: false,
		logger: (message) => mikroOrmLogger.log(message),
		// 业务进程复用连接；空闲 30 秒归还，避免占满 PostgreSQL 连接数。
		pool: { max: 10, idleTimeoutMillis: 30_000 },
		driverOptions: {
			// pg 会把该名字送到 PostgreSQL，便于在 pg_stat_activity 里区分本应用连接。
			application_name: `${config.app.name}-${config.app.nodeEnv}`,
			connectionTimeoutMillis: 5_000,
			// 单条 SQL 超过 30 秒中止，防止慢查询拖死连接池。
			statement_timeout: 30_000,
			// 等锁超过 5 秒失败，避免未提交事务长时间堵住后续请求。
			lock_timeout: 5_000,
			// 事务内空闲超过 60 秒由数据库断开，防止连接泄漏后一直占着事务。
			idle_in_transaction_session_timeout: 60_000,
		},
		// 迁移扩展
		extensions: [Migrator],
		migrations: {
			// 已执行版本记在这张表里，不要当业务表使用。
			tableName: "mikro_orm_migrations",
			// CLI 执行已编译文件；create 读写 TypeScript 源文件。
			path: join(process.cwd(), "dist/infrastructure/database/migrations"),
			pathTs: join(process.cwd(), "src/infrastructure/database/migrations"),
			glob: "Migration*.{js,ts,cjs}",
			// 单份 migration 包在一个事务里；allOrNothing 让一批 up 要么全成功要么全回滚。
			transactional: true,
			allOrNothing: true,
			// 禁止生成器在 down 里随意 DROP TABLE，避免误删数据。
			dropTables: false,
			snapshot,
			emit: "ts",
		},
	});
}

const config = createConfiguration();
export default createMikroOrmOptions(config, config.app.nodeEnv !== "production");
