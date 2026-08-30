import { Injectable, Logger } from "@nestjs/common";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { RoleEntity } from "@/modules/role/entities";
import { SYSTEM_INITIALIZATION_ROLES } from "./system-initialization.constants";

type ExistingRole = Pick<
	RoleEntity,
	"id" | "roleName" | "roleCode" | "dataScope" | "status" | "remark" | "deletedAt"
>;

/** 应用级系统数据初始化；每个操作都必须可重复执行且结果一致。 */
@Injectable()
export class SystemInitializationService {
	private readonly logger = new Logger(SystemInitializationService.name);

	constructor(private readonly em: EntityManager) {}

	/** 手动执行所有系统初始化操作。 */
	async initialize(): Promise<void> {
		await this.ensureRoles();
		this.logger.log(`系统初始化完成：已确保 ${SYSTEM_INITIALIZATION_ROLES.length} 个系统角色存在`);
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
							"dataScope",
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
								dataScope: role.dataScope,
								status: role.status,
								remark: role.remark,
							}),
						];
					}

					if (entity.roleName !== role.roleName) entity.roleName = role.roleName;
					if (entity.dataScope !== role.dataScope) entity.dataScope = role.dataScope;
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
}
