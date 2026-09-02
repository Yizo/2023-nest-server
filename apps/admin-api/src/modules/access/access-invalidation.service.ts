import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";
import { PermissionCacheService } from "./permission-cache.service";

/** 写侧权限失效端口：调用方只报自己的聚合，由 Access 查出受影响用户。 */
@Injectable()
export class AccessInvalidation {
	constructor(
		private readonly em: EntityManager,
		private readonly cache: PermissionCacheService,
	) {}

	async invalidateUser(userId: number): Promise<void> {
		await this.cache.invalidateUser(userId);
	}

	async invalidateRole(roleId: number): Promise<void> {
		const rows = (await this.em.execute(
			`SELECT DISTINCT ur."user_id"
			 FROM "sys_user_role" ur
			 WHERE ur."role_id" = ?`,
			[roleId],
			"all",
		)) as Array<{ user_id: number }>;
		await this.cache.invalidateUsers(rows.map((row) => row.user_id));
	}

	async invalidateMenu(menuId: number): Promise<void> {
		const rows = (await this.em.execute(
			`SELECT DISTINCT ur."user_id"
			 FROM "sys_role_menu" rm
			 INNER JOIN "sys_user_role" ur ON ur."role_id" = rm."role_id"
			 WHERE rm."menu_id" = ?
			 UNION
			 SELECT DISTINCT ur."user_id"
			 FROM "sys_user_role" ur
			 INNER JOIN "sys_role" r ON r."id" = ur."role_id"
			 WHERE r."role_code" = ?
			   AND r."deleted_at" IS NULL
			   AND r."status" = 1`,
			[menuId, SUPER_ADMIN_ROLE_CODE],
			"all",
		)) as Array<{ user_id: number }>;
		await this.cache.invalidateUsers(rows.map((row) => row.user_id));
	}
}
