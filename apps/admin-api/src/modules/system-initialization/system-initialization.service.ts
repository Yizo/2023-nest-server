import { Injectable, Logger } from "@nestjs/common";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { RoleEntity } from "@/modules/role/entities";
import { SUPER_ADMIN_ROLE } from "./system-initialization.constants";

/** 应用级系统数据初始化；每个操作都必须可重复执行且结果一致。 */
@Injectable()
export class SystemInitializationService {
	private readonly logger = new Logger(SystemInitializationService.name);

	constructor(private readonly em: EntityManager) {}

	/** 手动执行所有系统初始化操作 */
	async initialize(): Promise<void> {
		await this.ensureSuperAdmin();
		this.logger.log("系统初始化完成：超级管理员角色已确保存在");
	}

	/** 幂等确保超级管理员存在；已软删除时恢复，不创建重复角色。 */
	private async ensureSuperAdmin(): Promise<void> {
		try {
			await this.em.transactional(async (em) => {
				let entity = await em.findOne(RoleEntity, {
					roleCode: SUPER_ADMIN_ROLE.roleCode,
					deletedAt: null,
				});
				if (!entity) {
					entity = await em.findOne(RoleEntity, {
						roleCode: SUPER_ADMIN_ROLE.roleCode,
					});
				}

				if (!entity) {
					entity = em.create(RoleEntity, {
						roleName: SUPER_ADMIN_ROLE.roleName,
						roleCode: SUPER_ADMIN_ROLE.roleCode,
						dataScope: SUPER_ADMIN_ROLE.dataScope,
						status: SUPER_ADMIN_ROLE.status,
						remark: SUPER_ADMIN_ROLE.remark,
					});
					await em.persist(entity).flush();
					return;
				}

				if (entity.roleName !== SUPER_ADMIN_ROLE.roleName)
					entity.roleName = SUPER_ADMIN_ROLE.roleName;
				if (entity.dataScope !== SUPER_ADMIN_ROLE.dataScope)
					entity.dataScope = SUPER_ADMIN_ROLE.dataScope;
				if (entity.status !== SUPER_ADMIN_ROLE.status)
					entity.status = SUPER_ADMIN_ROLE.status;
				if (entity.remark !== SUPER_ADMIN_ROLE.remark)
					entity.remark = SUPER_ADMIN_ROLE.remark;
				if (entity.deletedAt !== null) entity.deletedAt = null;
				await em.flush();
			});
		} catch (error) {
			// 多个手动任务同时执行时，唯一索引只允许一个插入；其它任务重新读取即可。
			if (error instanceof UniqueConstraintViolationException) {
				const entity = await this.em.findOne(RoleEntity, {
					roleCode: SUPER_ADMIN_ROLE.roleCode,
					deletedAt: null,
				});
				if (entity) return;
			}
			throw error;
		}
	}
}
