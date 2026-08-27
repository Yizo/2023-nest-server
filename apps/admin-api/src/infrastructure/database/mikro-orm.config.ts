import { Migrator } from "@mikro-orm/migrations";
import { defineConfig, PostgreSqlDriver, type Options } from "@mikro-orm/postgresql";
import { Logger } from "@nestjs/common";
import { join } from "node:path";
import { createConfiguration, type AdminApiConfig } from "@/config";

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
		// 数据库连接字符串
		clientUrl: config.database.url,
		// 数据库 schema
		schema: "public",
		// 开发和 CLI 发现 TypeScript 实体，编译后的应用和生产 migration 发现 JavaScript 实体。
		baseDir: process.cwd(),
		entities: ["dist/**/*.entity.js"],
		entitiesTs: ["src/**/*.entity.ts"],
		// 禁止在请求上下文外使用全局 EntityManager，强制走每请求 fork，避免并发 Identity Map 串扰。
		allowGlobalContext: false,
		/**
		 * 根据 synchronize 配置（环境变量 DATABASE_SYNCHRONIZE=true），
		 * 在应用启动时检查目标数据库是否存在，若不存在则创建它。
		 * 注意它不会更新表结构，仅创建数据库本身。
		 */
		ensureDatabase: config.database.synchronize,
		// 关闭自动创建/更新索引
		ensureIndexes: false,
		// 数据库 schema 生成器
		schemaGenerator: {
			// 禁止在数据库层面生成物理外键约束
			createForeignKeyConstraints: false,
		},
		// 默认关闭 SQL 日志；开发环境显式设置 DB_DEBUG=true 才打印。
		debug: config.app.nodeEnv === "development" && config.database.debug,
		// 日志颜色
		colors: true,
		logger: (message) => mikroOrmLogger.log(message),
		// 连接池设置
		pool: {
			// 最大 10 个连接
			max: 10,
			// 空闲 30 秒归还，避免占满 PostgreSQL 连接数。
			idleTimeoutMillis: 30_000,
		},
		// 透传给 pg 驱动库的选项
		driverOptions: {
			// 在 pg_stat_activity 中标识应用名称，方便监控
			application_name: `${config.app.name}-${config.app.nodeEnv}`,
			// 建立连接的超时时间（5 秒）
			connectionTimeoutMillis: 5_000,
			// 单单条 SQL 语句执行超时（30 秒），防止慢查询拖垮连接池
			statement_timeout: 30_000,
			// 等待锁的超时（5 秒），避免长时间等待锁导致事务堆积
			lock_timeout: 5_000,
			// 事务内空闲超过 60 秒，PostgreSQL 会自动断开连接，防止事务泄漏
			idle_in_transaction_session_timeout: 60_000,
		},
		// 迁移扩展
		extensions: [Migrator],
		migrations: {
			// 记录已执行迁移版本的表名
			tableName: "mikro_orm_migrations",
			// 运行时（生产环境）迁移文件存放路径，指向编译后的 dist 目录
			path: join(process.cwd(), "dist/infrastructure/database/migrations"),
			// 开发时迁移源文件路径，指向 src，用于 npx mikro-orm migration:create 生成文件
			pathTs: join(process.cwd(), "src/infrastructure/database/migrations"),
			// 迁移文件匹配模式，支持 .js、.ts、.cjs 三种后缀
			glob: "Migration*.{js,ts,cjs}",
			// 每个迁移文件运行在一个事务中
			transactional: true,
			// 确保一批迁移要么全成功要么全回滚
			allOrNothing: true,
			// 禁止生成 down 中的 DROP TABLE，防止误删数据。如果你需要回滚，建议手动编写安全的 down 操作
			dropTables: false,
			// 控制是否生成快照文件
			snapshot,
			// 快照文件名
			snapshotName: ".snapshot-admin-api",
			// 输出迁移文件的语言版本
			emit: "ts",
		},
	});
}

const config = createConfiguration();
export default createMikroOrmOptions(config, config.app.nodeEnv !== "production");
