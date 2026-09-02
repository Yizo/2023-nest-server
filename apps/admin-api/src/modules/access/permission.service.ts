import { ForbiddenException, Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { MenuAccessNode } from "@/common/types";
import { PermissionCacheService } from "./permission-cache.service";
import { MenuType } from "@/modules/menu/menu.constants";
import { SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";

interface PermissionRow {
	code: string | null;
}

interface RoleRow {
	role_code: string;
}

interface MenuRow {
	id: number;
	type: string;
	parent_id: number | null;
	name: string;
	code: string | null;
	route_name: string | null;
	path: string | null;
	component: string | null;
	redirect: string | null;
	icon: string | null;
	sort: number;
	visible: boolean;
	keep_alive: boolean | null;
}

@Injectable()
export class PermissionService {
	constructor(
		private readonly em: EntityManager,
		private readonly cache: PermissionCacheService,
	) {}

	/** 检查当前用户是否拥有指定的全部操作权限。 */
	async assertPermissions(userId: number, required: string[]): Promise<void> {
		if (!required.length) return;
		const permissions = await this.getPermissions(userId);
		if (permissions.includes("*") || required.every((permission) => permissions.includes(permission))) return;
		throw new ForbiddenException("没有权限");
	}

	/** 查询当前用户的操作权限编码，超级管理员用通配符表示。 */
	async getPermissions(userId: number): Promise<string[]> {
		const cached = await this.cache.getPermissions(userId);
		if (cached !== null) return cached;

		const roles = (await this.em.execute(
			`SELECT DISTINCT r."role_code"
			 FROM "sys_user_role" ur
			 INNER JOIN "sys_role" r ON r."id" = ur."role_id"
			 WHERE ur."user_id" = ? AND r."deleted_at" IS NULL AND r."status" = 1`,
			[userId],
			"all",
		)) as RoleRow[];
		if (roles.some((role) => role.role_code === SUPER_ADMIN_ROLE_CODE)) {
			await this.cache.setPermissions(userId, ["*"]);
			return ["*"];
		}

		const rows = (await this.em.execute(
			`SELECT DISTINCT m."code"
			 FROM "sys_user_role" ur
			 INNER JOIN "sys_role" r ON r."id" = ur."role_id"
			 INNER JOIN "sys_role_menu" rm ON rm."role_id" = r."id"
			 INNER JOIN "sys_menu" m ON m."id" = rm."menu_id"
			 WHERE ur."user_id" = ?
			   AND r."deleted_at" IS NULL AND r."status" = 1
			   AND m."deleted_at" IS NULL AND m."type" = ? AND m."code" IS NOT NULL`,
			[userId, MenuType.ACTION],
			"all",
		)) as PermissionRow[];
		const permissions = rows.flatMap((row) => (row.code ? [row.code] : []));
		await this.cache.setPermissions(userId, permissions);
		return permissions;
	}

	/** 查询当前用户可展示的菜单树和操作权限。 */
	async getAccess(userId: number): Promise<{ menus: MenuAccessNode[]; permissions: string[] }> {
		const permissions = await this.getPermissions(userId);
		const isSuperAdmin = permissions.includes("*");
		const cached = await this.cache.getMenus(userId);
		if (cached !== null) return { menus: cached, permissions };

		const menus = (await this.em.execute(
			`SELECT m."id", m."type", m."parent_id", m."name", m."code", m."route_name",
			        m."path", m."component", m."redirect", m."icon", m."sort", m."visible", m."keep_alive"
			 FROM "sys_menu" m
			 WHERE m."deleted_at" IS NULL
			 ORDER BY m."sort" ASC, m."id" ASC`,
			[],
			"all",
		)) as MenuRow[];
		const allowedIds = isSuperAdmin
			? new Set(menus.map((menu) => menu.id))
			: await this.findAllowedMenuIds(userId);
		const menuById = new Map(menus.map((menu) => [menu.id, menu]));
		if (!isSuperAdmin) {
			for (const menuId of [...allowedIds]) {
				let current = menuById.get(menuId);
				const visited = new Set<number>();
				while (current?.parent_id != null && !visited.has(current.id)) {
					visited.add(current.id);
					allowedIds.add(current.parent_id);
					current = menuById.get(current.parent_id);
				}
			}
		}

		const nodes = new Map<number, MenuAccessNode>();
		for (const menu of menus) {
			if (!allowedIds.has(menu.id) || menu.type === MenuType.ACTION || !menu.visible) continue;
			nodes.set(menu.id, {
				id: menu.id,
				type: menu.type,
				parentId: menu.parent_id,
				name: menu.name,
				code: menu.code,
				routeName: menu.route_name,
				path: menu.path,
				component: menu.component,
				redirect: menu.redirect,
				icon: menu.icon,
				sort: menu.sort,
				visible: menu.visible,
				keepAlive: menu.keep_alive,
				children: [],
			});
		}

		const roots: MenuAccessNode[] = [];
		for (const node of nodes.values()) {
			const parent = node.parentId == null ? undefined : nodes.get(node.parentId);
			if (parent) parent.children.push(node);
			else roots.push(node);
		}
		await this.cache.setMenus(userId, roots);
		return { menus: roots, permissions };
	}

	private async findAllowedMenuIds(userId: number): Promise<Set<number>> {
		const rows = (await this.em.execute(
			`SELECT DISTINCT rm."menu_id"
			 FROM "sys_user_role" ur
			 INNER JOIN "sys_role" r ON r."id" = ur."role_id"
			 INNER JOIN "sys_role_menu" rm ON rm."role_id" = r."id"
			 INNER JOIN "sys_menu" m ON m."id" = rm."menu_id"
			 WHERE ur."user_id" = ?
			   AND r."deleted_at" IS NULL AND r."status" = 1
			   AND m."deleted_at" IS NULL`,
			[userId],
			"all",
		)) as Array<{ menu_id: number }>;
		return new Set(rows.map((row) => row.menu_id));
	}

}
