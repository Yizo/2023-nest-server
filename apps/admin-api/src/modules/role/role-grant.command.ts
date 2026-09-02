import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { RoleMenuDataService } from "./role-menu-data.service";

/** 角色授权命令端口。Menu 删除时只能通过这里写 sys_role_menu。 */
@Injectable()
export class RoleGrantCommand {
	constructor(private readonly roleMenus: RoleMenuDataService) {}

	async clearGrantsByMenu(em: EntityManager, menuId: number): Promise<void> {
		await this.roleMenus.clearMenuRoles(em, menuId);
	}
}
