import { Injectable, NotFoundException } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { normalizeIds } from "@/common/utils";
import { MenuEntity } from "@/modules/menu/entities/menu.entity";
import { RoleEntity } from "./entities/role.entity";
import { RoleMenuEntity } from "./entities/role-menu.entity";

/** 负责 sys_role_menu 关联表的数据读写 */
@Injectable()
export class RoleMenuDataService {
	// 数据方法

	/**
	 * 检查准备分配给角色的菜单是否都存在且未软删除。
	 */
	async assertMenusAvailable(em: EntityManager, menuIds: number[]): Promise<void> {
		if (!menuIds.length) return;

		const menus = await em.find(
			MenuEntity,
			{ id: { $in: menuIds }, deletedAt: null },
			{ fields: ["id"], lockMode: LockMode.PESSIMISTIC_READ },
		);
		if (menus.length !== menuIds.length) {
			throw new NotFoundException("存在不存在或已删除的菜单");
		}
	}

	/**
	 * 根据角色 ID 查询角色当前拥有的菜单 ID列表。
	 */
	async findMenuIds(em: EntityManager, roleId: number): Promise<number[]> {
		const relations = await em.find(
			RoleMenuEntity,
			{ role: em.getReference(RoleEntity, roleId) },
			{ fields: ["menu.id"] },
		);
		return relations.map((relation) => relation.menu.id);
	}

	/**
	 * 根据角色 ID 和菜单 ID 列表删除角色菜单关系。
	 */
	async removeRoleMenus(em: EntityManager, roleId: number, menuIds: number[]): Promise<void> {
		if (!menuIds.length) return;

		await em.nativeDelete(RoleMenuEntity, {
			role: em.getReference(RoleEntity, roleId),
			menu: { id: { $in: menuIds } },
		});
	}

	/**
	 * 根据角色 ID 和菜单 ID 列表批量新增角色菜单关系。
	 */
	async addRoleMenus(em: EntityManager, roleId: number, menuIds: number[]): Promise<void> {
		if (!menuIds.length) return;

		const role = em.getReference(RoleEntity, roleId);
		await em.insertMany(
			RoleMenuEntity,
			menuIds.map((menuId) => ({
				role,
				menu: em.getReference(MenuEntity, menuId),
			})),
		);
	}

	/**
	 * 根据角色 ID 删除该角色在 sys_role_menu 中的全部关系。
	 */
	async clearRoleMenus(em: EntityManager, roleId: number): Promise<void> {
		await em.nativeDelete(RoleMenuEntity, {
			role: em.getReference(RoleEntity, roleId),
		});
	}

	/**
	 * 根据菜单 ID 删除该菜单在 sys_role_menu 中的全部关系。
	 */
	async clearMenuRoles(em: EntityManager, menuId: number): Promise<void> {
		await em.nativeDelete(RoleMenuEntity, {
			menu: em.getReference(MenuEntity, menuId),
		});
	}
}
