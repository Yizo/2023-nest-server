import { Injectable, NotFoundException } from "@nestjs/common";
import { type FilterQuery, LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { MenuResult } from "./dto";
import { MenuEntity } from "./entities";

type MenuView = Pick<
	MenuEntity,
	| "id"
	| "type"
	| "parentId"
	| "name"
	| "code"
	| "routeName"
	| "path"
	| "component"
	| "redirect"
	| "icon"
	| "sort"
	| "visible"
	| "keepAlive"
	| "createdAt"
	| "updatedAt"
>;
type MenuWriteEntity = MenuView & Pick<MenuEntity, "deletedAt">;
type MenuParentView = Pick<MenuEntity, "id" | "parentId">;

@Injectable()
export class MenuDataService {
	// 公共方法

	/** 把菜单 Entity 转成接口返回，不暴露 deletedAt。 */
	toMenuResult(entity: MenuView): MenuResult {
		return {
			id: entity.id,
			type: entity.type,
			parentId: entity.parentId ?? null,
			name: entity.name,
			code: entity.code ?? null,
			routeName: entity.routeName ?? null,
			path: entity.path ?? null,
			component: entity.component ?? null,
			redirect: entity.redirect ?? null,
			icon: entity.icon ?? null,
			sort: entity.sort,
			visible: entity.visible,
			keepAlive: entity.keepAlive ?? null,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	// 数据方法

	/** 按主键查询未删除菜单；需要时锁定菜单，避免同时修改或删除。 */
	async findMenuEntity(
		em: EntityManager,
		id: number,
		lockForWrite = false,
	): Promise<MenuWriteEntity> {
		const entity = await em.findOne(
			MenuEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"type",
					"parentId",
					"name",
					"code",
					"routeName",
					"path",
					"component",
					"redirect",
					"icon",
					"sort",
					"visible",
					"keepAlive",
					"createdAt",
					"updatedAt",
					"deletedAt",
				],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("菜单不存在");
		return entity;
	}

	/** 查询有效父菜单；父菜单为空表示当前菜单放在根目录。 */
	async findParentEntity(
		em: EntityManager,
		parentId: number | null | undefined,
		lockForWrite = false,
	): Promise<MenuParentView | null> {
		if (parentId == null) return null;

		const entity = await em.findOne(
			MenuEntity,
			{ id: parentId, deletedAt: null },
			{
				fields: ["id", "parentId"],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("父菜单不存在");
		return entity;
	}

	/** 判断目标父菜单是否在当前菜单的下级，避免移动后形成循环。 */
	async isDescendant(em: EntityManager, menuId: number, parentId: number): Promise<boolean> {
		/*
		 * 从目标父菜单开始逐级向上查找：
		 * 1. 如果向上找到了当前菜单，说明目标父菜单是当前菜单的后代；
		 * 2. 找到根菜单后停止；
		 * 3. 使用 UNION 去重，避免已有异常循环时 SQL 无限递归。
		 */
		const result = (await em.execute(
			`WITH RECURSIVE menu_ancestors AS (
				SELECT "id", "parent_id"
				FROM "sys_menu"
				WHERE "id" = ? AND "deleted_at" IS NULL
				UNION
				SELECT parent."id", parent."parent_id"
				FROM "sys_menu" parent
				INNER JOIN menu_ancestors child ON child."parent_id" = parent."id"
				WHERE parent."deleted_at" IS NULL
			)
			SELECT EXISTS (
				SELECT 1 FROM menu_ancestors WHERE "id" = ?
			) AS "exists"`,
			[parentId, menuId],
			"get",
		)) as { exists?: boolean };
		return result.exists === true;
	}

	/** 判断菜单是否存在有效子菜单。 */
	async hasActiveChildren(em: EntityManager, parentId: number): Promise<boolean> {
		return (
			(await em.findOne(MenuEntity, { parentId, deletedAt: null }, { fields: ["id"] })) !== null
		);
	}

	/** 判断有效菜单中是否已经使用了编码。 */
	async isCodeUsed(em: EntityManager, code: string, excludeId?: number): Promise<boolean> {
		const where: FilterQuery<MenuEntity> = { code, deletedAt: null };
		if (excludeId !== undefined) where.id = { $ne: excludeId };
		return (await em.findOne(MenuEntity, where, { fields: ["id"] })) !== null;
	}

	/** 判断有效菜单中是否已经使用了路由名称。 */
	async isRouteNameUsed(
		em: EntityManager,
		routeName: string,
		excludeId?: number,
	): Promise<boolean> {
		const where: FilterQuery<MenuEntity> = { routeName, deletedAt: null };
		if (excludeId !== undefined) where.id = { $ne: excludeId };
		return (await em.findOne(MenuEntity, where, { fields: ["id"] })) !== null;
	}
}
