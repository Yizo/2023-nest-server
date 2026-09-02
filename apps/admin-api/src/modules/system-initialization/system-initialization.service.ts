import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { AdminApiConfig } from "@/config";
import { AccessInvalidation } from "@/modules/access/access-invalidation.service";
import { RoleGrantCommand } from "@/modules/role/role-grant.command";
import { UserQuery } from "@/modules/user/user-query.service";
import { InitializeSystemDto } from "./dto";
import { SYSTEM_INITIALIZATION_ROLES } from "./system-initialization.constants";

/** 应用级系统数据初始化；每个操作都必须可重复执行且结果一致。 */
@Injectable()
export class SystemInitializationService {
	private readonly logger = new Logger(SystemInitializationService.name);
	private readonly config: AdminApiConfig["auth"];

	constructor(
		private readonly roles: RoleGrantCommand,
		private readonly users: UserQuery,
		private readonly accessInvalidation: AccessInvalidation,
		configService: ConfigService,
	) {
		this.config = configService.getOrThrow<AdminApiConfig>("app").auth;
	}

	/** 使用初始化密钥，手动执行所有系统初始化操作。 */
	async initialize(initializationKey: string | undefined, dto: InitializeSystemDto): Promise<void> {
		this.assertInitializationKey(initializationKey);
		await this.roles.ensureSystemRoles(SYSTEM_INITIALIZATION_ROLES);
		const userId = await this.users.ensureSuperAdmin(dto);
		await this.accessInvalidation.invalidateUser(userId);
		this.logger.log(
			`系统初始化完成：已确保 ${SYSTEM_INITIALIZATION_ROLES.length} 个系统角色和超级管理员用户 ${userId} 存在`,
		);
	}

	/** 校验初始化密钥，避免公开接口被任意调用。 */
	private assertInitializationKey(initializationKey: string | undefined): void {
		const expected = this.config.initializationKey;
		if (!expected) throw new ForbiddenException("系统初始化密钥未配置");
		const providedBuffer = Buffer.from(initializationKey ?? "");
		const expectedBuffer = Buffer.from(expected);
		if (
			providedBuffer.length !== expectedBuffer.length ||
			!timingSafeEqual(providedBuffer, expectedBuffer)
		) {
			throw new ForbiddenException("系统初始化密钥错误");
		}
	}
}
