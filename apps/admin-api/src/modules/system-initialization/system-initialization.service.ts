import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
} from "@nestjs/common";
import { LockMode, UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { AdminApiConfig } from "@/config";
import { AccessInvalidation } from "@/modules/access/access-invalidation.service";
import { RoleEntity } from "@/modules/role/entities";
import { SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";
import { UserEntity, UserRoleEntity } from "@/modules/user/entities";
import { UserDataService } from "@/modules/user/user-data.service";
import { InitializeSystemDto } from "./dto";
import { SYSTEM_INITIALIZATION_ROLES } from "./system-initialization.constants";

type ExistingRole = Pick<
	RoleEntity,
	"id" | "roleName" | "roleCode" | "status" | "remark" | "deletedAt"
>;

/** 应用级系统数据初始化；每个操作都必须可重复执行且结果一致。 */
@Injectable()
export class SystemInitializationService {
	private readonly logger = new Logger(SystemInitializationService.name);
	private readonly config: AdminApiConfig["auth"];

	constructor(
		private readonly em: EntityManager,
		private readonly users: UserDataService,
		private readonly accessInvalidation: AccessInvalidation,
		configService: ConfigService,
	) {
		this.config = configService.getOrThrow<AdminApiConfig>("app").auth;
	}

	/** 使用初始化密钥，手动执行所有系统初始化操作。 */
	async initialize(initializationKey: string | undefined, dto: InitializeSystemDto): Promise<void> {
		this.assertInitializationKey(initializationKey);
		await this.ensureRoles();
		const userId = await this.ensureSuperAdmin(dto);
		const roleIds = await this.findInitializedRoleIds();
		for (const roleId of roleIds) {
			await this.accessInvalidation.invalidateRole(roleId);
		}
		this.logger.log(
			`系统初始化完成：已确保 ${SYSTEM_INITIALIZATION_ROLES.length} 个系统角色和超级管理员用户 ${userId} 存在`,
		);
	}

	/** 查询初始化维护的有效角色对应的用户，供角色范围或权限变化后清理缓存。 */
	private async findInitializedRoleIds(): Promise<number[]> {
		const roleCodes = SYSTEM_INITIALIZATION_ROLES.map((role) => role.roleCode);
		const roles = await this.em.find(
			RoleEntity,
			{ roleCode: { $in: roleCodes }, deletedAt: null },
			{ fields: ["id"] },
		);
		return roles.map((role) => role.id);
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

	/** 一次查询并处理全部系统角色，避免逐个开启事务和写入数据库。 */
	private async ensureRoles(retry = false): Promise<void> {
		try {
			await this.em.transactional(async (em) => {
				const roleCodes = SYSTEM_INITIALIZATION_ROLES.map((role) => role.roleCode);
				const existingRoles = await em.find(
					RoleEntity,
					{ roleCode: { $in: roleCodes } },
					{
						fields: [
							"id",
							"roleName",
							"roleCode",
							"status",
							"remark",
							"deletedAt",
						],
					},
				);
				const rolesByCode = new Map<string, ExistingRole[]>();
				for (const entity of existingRoles) {
					const roles = rolesByCode.get(entity.roleCode) ?? [];
					roles.push(entity);
					rolesByCode.set(entity.roleCode, roles);
				}

				const newRoles = SYSTEM_INITIALIZATION_ROLES.flatMap((role) => {
					const existing = rolesByCode.get(role.roleCode) ?? [];
					const entity = existing.find((item) => item.deletedAt === null) ?? existing[0];
					if (!entity) {
						return [
							em.create(RoleEntity, {
								roleName: role.roleName,
								roleCode: role.roleCode,
								status: role.status,
								remark: role.remark,
							}),
						];
					}

					if (entity.roleName !== role.roleName) entity.roleName = role.roleName;
					if (entity.status !== role.status) entity.status = role.status;
					if (entity.remark !== role.remark) entity.remark = role.remark;
					if (entity.deletedAt !== null) entity.deletedAt = null;
					return [];
				});

				if (newRoles.length) em.persist(newRoles);
				await em.flush();
			});
		} catch (error) {
			// 多个手动任务同时执行时，唯一索引只允许一个插入；其它任务重新读取即可。
			if (error instanceof UniqueConstraintViolationException && !retry) {
				await this.ensureRoles(true);
				return;
			}
			throw error;
		}
	}

	/** 确保超级管理员用户存在并拥有超级管理员角色；重复执行不会重置密码。 */
	private async ensureSuperAdmin(dto: InitializeSystemDto, retry = false): Promise<number> {
		try {
			return await this.em.transactional(async (em) => {
				const role = await em.findOne(
					RoleEntity,
					{ roleCode: SUPER_ADMIN_ROLE_CODE, deletedAt: null },
					{ fields: ["id"], lockMode: LockMode.PESSIMISTIC_WRITE },
				);
				if (!role) throw new ConflictException("超级管理员角色初始化失败");

				const relation = await em.findOne(
					UserRoleEntity,
					{ role },
					{ fields: ["user.id"] },
				);
				if (relation) {
					const existingUser = await em.findOne(
						UserEntity,
						{ id: relation.user.id },
						{ fields: ["id", "status", "deletedAt"] },
					);
					if (existingUser) {
						if (existingUser.status !== 1) existingUser.status = 1;
						if (existingUser.deletedAt !== null) existingUser.deletedAt = null;
						await em.flush();
						return existingUser.id;
					}
				}

				if (!dto.userName || !dto.password) {
					throw new BadRequestException("首次初始化必须提供超级管理员账号和密码");
				}
				const userName = this.users.normalizeUserName(dto.userName);
				if (await em.findOne(UserEntity, { userName, deletedAt: null }, { fields: ["id"] })) {
					throw new ConflictException("超级管理员账号已被其他用户使用");
				}

				const user = em.create(UserEntity, {
					userName,
					displayName: "超级管理员",
					passwordHash: await this.users.hashPassword(dto.password),
					status: 1,
				});
				await em.flush();
				await this.users.addUserRoles(em, user.id, [role.id]);
				return user.id;
			});
		} catch (error) {
			if (error instanceof UniqueConstraintViolationException && !retry) {
				return this.ensureSuperAdmin(dto, true);
			}
			throw error;
		}
	}
}
