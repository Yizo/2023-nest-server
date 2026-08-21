// 加载 reflect-metadata，确保 MikroORM 装饰器和 Nest 依赖注入元数据可用。
import "reflect-metadata";
// 读取生产环境挂载的管理员密码文件。
import { readFile } from "node:fs/promises";
// 创建不监听 HTTP 的 Nest application context。
import { NestFactory } from "@nestjs/core";
// 用 Argon2 对首次管理员密码进行不可逆哈希。
import * as argon2 from "argon2";
// 复用应用统一的 MikroORM 连接和 migration 配置。
import { initMikroOrm } from "@/database/mikro-orm.options";
// 执行数据库逻辑关联巡检。
import { IntegrityAuditService } from "@/database/integrity-audit.service";
// 创建或查询平台所有者用户实体。
import { User } from "@/database/entities";
// 访问 BullMQ 队列并同步后台任务。
import { BackgroundJobsService } from "@/infrastructure/queue/background-jobs.service";
// ToolModule 只注册 CLI 所需要的 Nest provider。
import { ToolModule } from "./tool.module";

/**
 * 首次管理员初始化命令。
 *
 * 这个函数只在显式执行 bootstrap-admin 或 init 时运行，
 * 不会因为 API/Worker 重启而重复修改数据库。
 */
async function bootstrapAdmin(): Promise<void> {
	// 从环境变量读取管理员邮箱，并统一转换为小写。
	const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
	// 从环境变量读取管理员用户名，缺省值是 superadmin。
	const username = (process.env.BOOTSTRAP_ADMIN_USERNAME ?? "superadmin")
		.trim()
		.toLowerCase();
	// 读取管理员展示名称；它不参与登录和权限判断。
	const displayName = process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME?.trim() || "Platform Owner";
	// 生产环境通过 Docker Secret 文件提供密码。
	const passwordFile = process.env.BOOTSTRAP_ADMIN_PASSWORD_FILE;
	// 本地开发允许使用明文环境变量，减少第一次学习的配置步骤。
	const developmentPassword =
		process.env.NODE_ENV !== "production" ? process.env.BOOTSTRAP_ADMIN_PASSWORD : undefined;
	// 邮箱、用户名和密码缺一不可，避免创建不可用的管理员。
	if (!email || !username || (!passwordFile && !developmentPassword)) {
		throw new Error("BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD_FILE are required");
	}
	// 生产环境优先读取密码文件，本地环境才使用明文变量。
	const password = passwordFile
		? (await readFile(passwordFile, "utf8")).trim()
		: developmentPassword!;
	// 设置最低密码长度，防止初始化时创建极弱密码。
	if (password.length < 12)
		throw new Error("Bootstrap password must contain at least 12 characters");
	// CLI 独立创建 ORM，不复用 API 进程的连接池。
	const orm = await initMikroOrm();
	try {
		// fork 出独立 EntityManager，避免使用全局 EntityManager。
		const em = orm.em.fork();
		// 用户和唯一性检查必须在一个事务中完成。
		await em.transactional(async (tx) => {
			// 系统只允许一个未删除的平台所有者。
			const existingOwner = await tx.findOne(User, {
				isPlatformOwner: true,
				deletedAt: null,
			});
			// 如果相同邮箱的 owner 已存在，重复初始化视为成功并直接返回。
			if (existingOwner) {
				if (existingOwner.email === email) return;
				throw new Error(
					"A platform owner already exists; bootstrap will not create another one",
				);
			}
			// 邮箱已经属于普通用户时，禁止静默提升权限。
			const existingUser = await tx.findOne(User, { email });
			if (existingUser)
				throw new Error("The bootstrap email already belongs to a non-owner user");
			// 用户名已经被其他用户使用时，拒绝创建重复登录名。
			const existingUsername = await tx.findOne(User, { username });
			if (existingUsername)
				throw new Error("The bootstrap username already belongs to another user");
			// 创建用户对象，密码字段只保存 Argon2 哈希。
			const user = tx.create(User, {
				username,
				email,
				displayName,
				passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
				isPlatformOwner: true,
			});
			// 把新用户加入当前事务的待写入集合。
			tx.persist(user);
			// flush 才会真正向数据库写入用户。
			await tx.flush();
		});
		// 命令行输出结果，不输出密码和哈希。
		process.stdout.write(`Platform owner is ready: ${email}\n`);
	} finally {
		// 无论成功或失败都关闭 CLI 创建的数据库连接。
		await orm.close(true);
	}
}

/** 执行只读的逻辑关联巡检，发现问题时返回退出码 2。 */
async function orphanCheck(): Promise<void> {
	// 巡检命令不会启动 HTTP 服务。
	const orm = await initMikroOrm();
	try {
		// 使用独立 EntityManager 执行所有关联检查。
		const issues = await new IntegrityAuditService(orm.em.fork()).run();
		// 以格式化 JSON 输出，方便人工阅读和 CI 收集。
		process.stdout.write(`${JSON.stringify({ issues }, null, 2)}\n`);
		// 发现孤儿记录时让自动化任务识别为失败。
		if (issues.length) process.exitCode = 2;
	} finally {
		// 关闭只读巡检使用的 ORM 连接。
		await orm.close(true);
	}
}

/**
 * 统一处理数据库 migration 命令。
 * up=执行、down=回退、status=查看状态、create=生成新 migration。
 */
async function migrationCommand(command: "up" | "down" | "status" | "create"): Promise<void> {
	// 所有迁移命令都复用同一套 ORM 配置，保证 CLI 和 API 看到相同实体。
	const orm = await initMikroOrm();
	try {
		// 根据 command 分派到具体的 MikroORM Migrator 方法。
		if (command === "up") {
			// 按 app_migrations 记录的版本顺序执行所有待迁移。
			const result = await orm.migrator.up();
			// 输出执行结果和 migration 文件路径。
			process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		} else if (command === "down") {
			// 回退前应确认 migration 是否允许 down；基线 migration 会主动拒绝。
			const result = await orm.migrator.down();
			// 输出回退结果。
			process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		} else if (command === "status") {
			// 空数据库首次检查时，两次调用都会初始化 app_migrations 表。
			// 必须顺序执行，避免并发创建表导致 PostgreSQL 元数据冲突。
			const executed = await orm.migrator.getExecuted();
			// 读取已经执行的 migration 列表。
			const pending = await orm.migrator.getPending();
			// 读取源码目录中尚未执行的 migration 列表。
			process.stdout.write(`${JSON.stringify({ executed, pending }, null, 2)}\n`);
		} else {
			// 根据实体和数据库差异生成新的 migration 文件。
			const result = await orm.migrator.create();
			// 生成后必须人工审查 SQL，尤其是删除字段或修改数据的语句。
			process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		}
	} finally {
		// 关闭 migration 命令使用的数据库连接。
		await orm.close(true);
	}
}

/** 在没有 HTTP 服务器的 Nest application context 中执行队列运维命令。 */
async function withQueue(run: (jobs: BackgroundJobsService) => Promise<void>): Promise<void> {
	// ToolModule 只创建队列相关 provider，不监听 HTTP 端口。
	const app = await NestFactory.createApplicationContext(ToolModule, {
		logger: ["error", "warn"],
	});
	try {
		// 从容器取得 BackgroundJobsService，交给调用方执行具体操作。
		await run(app.get(BackgroundJobsService));
	} finally {
		// 无论命令成功或失败都关闭 Nest application context。
		await app.close();
	}
}

/** 查看失败任务，或在 retry=true 时逐个发起重试。 */
async function queueFailed(retry: boolean): Promise<void> {
	await withQueue(async (jobs) => {
		// 读取最多 100 条失败任务，默认只查看，不改变队列状态。
		const failed = await jobs.getQueue().getFailed(0, 99);
		if (retry) {
			// retry 命令逐个重试失败任务，让 BullMQ 继续执行原有处理逻辑。
			for (const job of failed) await job.retry();
			// 输出本次实际提交重试的任务数量。
			process.stdout.write(`Retried ${failed.length} failed jobs\n`);
			return;
		}
		// 查看模式只输出任务 ID、名称、失败原因和已尝试次数。
		process.stdout.write(
			`${JSON.stringify(
				failed.map((job) => ({
					id: job.id,
					name: job.name,
					failedReason: job.failedReason,
					attemptsMade: job.attemptsMade,
				})),
				null,
				2,
			)}\n`,
		);
	});
}

/**
 * 首次部署的一键初始化。
 *
 * 不能改变执行顺序：先创建表结构，再创建管理员，最后同步队列调度。
 */
async function initialize(): Promise<void> {
	// 第一步：执行待处理数据库 migration。
	await migrationCommand("up");
	// 第二步：创建或确认平台所有者。
	await bootstrapAdmin();
	// 第三步：同步清理、补偿和巡检任务。
	await withQueue(async (jobs) => jobs.syncSchedules());
	// 输出一键初始化完成提示。
	process.stdout.write("Initial setup completed: migration, bootstrap-admin, queue schedules\n");
}

/** 读取命令行参数并分派到对应的运维操作。 */
async function main(): Promise<void> {
	// process.argv[2] 是 npm script 之后传给 cli.ts 的第一个业务参数。
	const command = process.argv[2];
	// 每个 case 对应 package.json 中的一条数据库/队列命令。
	switch (command) {
		case "migrate":
			// 执行待处理 migration。
			return migrationCommand("up");
		case "rollback":
			// 回退最近一次 migration（基线会拒绝）。
			return migrationCommand("down");
		case "migration-status":
			// 查看已执行和待执行 migration。
			return migrationCommand("status");
		case "migration-create":
			// 根据实体差异生成 migration 文件。
			return migrationCommand("create");
		case "init":
			// 执行首次部署的完整初始化流程。
			return initialize();
		case "bootstrap-admin":
			// 单独创建或确认平台所有者。
			return bootstrapAdmin();
		case "orphan-check":
			// 执行逻辑关联孤儿巡检。
			return orphanCheck();
		case "queue-schedule-sync":
			// 幂等同步三个周期队列调度器。
			return withQueue(async (jobs) => jobs.syncSchedules());
		case "queue-failed":
			// 查看失败队列任务。
			return queueFailed(false);
		case "queue-retry-failed":
			// 重试失败队列任务。
			return queueFailed(true);
		default:
			// 未知命令直接失败，避免执行错误的运维操作。
			throw new Error(`Unknown command: ${command ?? "(missing)"}`);
	}
}

// CLI 顶层捕获异常，输出堆栈并设置非零退出码交给 shell/CI。
void main().catch((error) => {
	// Error 有 stack 时输出完整堆栈，否则输出普通错误字符串。
	process.stderr.write(
		`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
	);
	// 非零退出码表示初始化、迁移或队列运维失败。
	process.exitCode = 1;
});
