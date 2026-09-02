import { Injectable } from "@nestjs/common";
import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { RoleEntity } from "./entities";
import { RoleMenuDataService } from "./role-menu-data.service";

type SystemRoleSeed = {
	roleCode: string;
	roleName: string;
	status: 0 | 1;
	remark: string;
};

type ExistingRole = Pick<
	RoleEntity,
	"id" | "roleName" | "roleCode" | "status" | "remark" | "deletedAt"
>;

/** 角色授权命令端口。Menu 删除时只能通过这里写 sys_role_menu。 */
@Injectable()
export class RoleGrantCommand {
	constructor(
		private readonly roleMenus: RoleMenuDataService,
		private readonly em: EntityManager,
	) {}

	async clearGrantsByMenu(em: EntityManager, menuId: number): Promise<void> {
		await this.roleMenus.clearMenuRoles(em, menuId);
	}

	async ensureSystemRoles(roles: readonly SystemRoleSeed[], retry = false): Promise<void> {
		try {
			await this.em.transactional(async (em) => {
				const roleCodes = roles.map((role) => role.roleCode);
				const existingRoles = await em.find(
					RoleEntity,
					{ roleCode: { $in: [...roleCodes] } },
					{ fields: ["id", "roleName", "roleCode", "status", "remark", "deletedAt"] },
				);
				const rolesByCode = new Map<string, ExistingRole[]>();
				for (const entity of existingRoles) {
					const grouped = rolesByCode.get(entity.roleCode) ?? [];
					grouped.push(entity);
					rolesByCode.set(entity.roleCode, grouped);
				}

				const newRoles = roles.flatMap((role) => {
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
				await this.ensureSystemRoles(roles, true);
				return;
			}
			throw error;
		}
	}
}
