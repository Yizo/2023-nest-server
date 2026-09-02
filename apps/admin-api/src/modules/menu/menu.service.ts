import {
	BadRequestException,
	ConflictException,
	Injectable,
} from "@nestjs/common";
import { type FilterQuery, UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	getOffsetPagination,
	type PageResult,
} from "@/common/pagination";
import { AccessInvalidation } from "@/modules/access/access-invalidation.service";
import { CreateMenuDto, MenuResult, QueryMenuDto, UpdateMenuDto } from "./dto";
import { MenuType } from "./menu.constants";
import { MenuEntity } from "./entities";
import { MenuDataService } from "./menu-data.service";
import { RoleMenuDataService } from "./role-menu-data.service";

@Injectable()
export class MenuService {
	constructor(
		private readonly em: EntityManager,
		private readonly data: MenuDataService,
		private readonly roleMenus: RoleMenuDataService,
		private readonly accessInvalidation: AccessInvalidation,
	) {}

	// 菜单方法

	/** 创建菜单前检查不同类型允许使用哪些字段。 */
	private assertCreateFields(dto: CreateMenuDto): void {
		if (dto.type === MenuType.PAGE) {
			if (!this.isNonEmptyString(dto.path)) throw new BadRequestException("页面类型必须填写路由路径");
			if (!this.isNonEmptyString(dto.component)) {
				throw new BadRequestException("页面类型必须填写页面组件");
			}
			if (dto.keepAlive !== undefined && typeof dto.keepAlive !== "boolean") {
				throw new BadRequestException("是否缓存页面必须是布尔值");
			}
			return;
		}

		if (dto.type === MenuType.MENU) {
			if (dto.component !== undefined) throw new BadRequestException("菜单类型不能填写页面组件");
			if (dto.keepAlive !== undefined) throw new BadRequestException("菜单类型不能填写页面缓存配置");
			return;
		}

		if (dto.type === MenuType.EXTERNAL) {
			if (!this.isNonEmptyString(dto.path)) throw new BadRequestException("外链类型必须填写外链地址");
			if (dto.routeName !== undefined) throw new BadRequestException("外链类型不能填写路由名称");
			if (dto.component !== undefined) throw new BadRequestException("外链类型不能填写页面组件");
			if (dto.redirect !== undefined) throw new BadRequestException("外链类型不能填写重定向地址");
			if (dto.keepAlive !== undefined) throw new BadRequestException("外链类型不能填写页面缓存配置");
			return;
		}

		if (!this.isNonEmptyString(dto.code)) throw new BadRequestException("操作类型必须填写编码");
		for (const [field, value] of [
			["routeName", dto.routeName],
			["path", dto.path],
			["component", dto.component],
			["redirect", dto.redirect],
			["icon", dto.icon],
			["keepAlive", dto.keepAlive],
		] as const) {
			if (value !== undefined) throw new BadRequestException(`操作类型不能填写${field}`);
		}
	}

	/** 更新菜单前检查当前类型允许修改哪些字段。 */
	private assertUpdateFields(type: MenuType, dto: UpdateMenuDto): void {
		if (dto.name !== undefined && !this.isNonEmptyString(dto.name)) {
			throw new BadRequestException("名称不能为空");
		}
		if (dto.visible !== undefined && typeof dto.visible !== "boolean") {
			throw new BadRequestException("是否显示必须是布尔值");
		}
		if (dto.keepAlive !== undefined && type !== MenuType.PAGE) {
			throw new BadRequestException("当前菜单类型不能填写页面缓存配置");
		}

		if (type === MenuType.PAGE) {
			if (dto.path !== undefined && !this.isNonEmptyString(dto.path)) {
				throw new BadRequestException("页面类型的路由路径不能为空");
			}
			if (dto.component !== undefined && !this.isNonEmptyString(dto.component)) {
				throw new BadRequestException("页面类型的页面组件不能为空");
			}
			return;
		}

		if (type === MenuType.MENU) {
			if (dto.component !== undefined) throw new BadRequestException("菜单类型不能填写页面组件");
			if (dto.keepAlive !== undefined) throw new BadRequestException("菜单类型不能填写页面缓存配置");
			return;
		}

		if (type === MenuType.EXTERNAL) {
			if (dto.path !== undefined && !this.isNonEmptyString(dto.path)) {
				throw new BadRequestException("外链类型的外链地址不能为空");
			}
			for (const [field, value] of [
				["routeName", dto.routeName],
				["component", dto.component],
				["redirect", dto.redirect],
				["keepAlive", dto.keepAlive],
			] as const) {
				if (value !== undefined) throw new BadRequestException(`外链类型不能填写${field}`);
			}
			return;
		}

		if (dto.code !== undefined && !this.isNonEmptyString(dto.code)) {
			throw new BadRequestException("操作类型的编码不能为空");
		}
		for (const [field, value] of [
			["routeName", dto.routeName],
			["path", dto.path],
			["component", dto.component],
			["redirect", dto.redirect],
			["icon", dto.icon],
		] as const) {
			if (value !== undefined) throw new BadRequestException(`操作类型不能填写${field}`);
		}
	}

	/** 判断值是否为非空字符串。 */
	private isNonEmptyString(value: unknown): value is string {
		return typeof value === "string" && value.trim().length > 0;
	}

	/** 检查编码和路由名称是否与其他有效菜单冲突。 */
	private async assertUniqueValues(
		em: EntityManager,
		code: string | null,
		routeName: string | null,
		excludeId?: number,
	): Promise<void> {
		if (code && (await this.data.isCodeUsed(em, code, excludeId))) {
			throw new ConflictException("菜单编码已存在");
		}
		if (routeName && (await this.data.isRouteNameUsed(em, routeName, excludeId))) {
			throw new ConflictException("路由名称已存在");
		}
	}

	/** 新增菜单；页面、菜单和外链可不传编码，操作类型必须传编码。 */
	async createMenu(dto: CreateMenuDto): Promise<MenuResult> {
		this.assertCreateFields(dto);

		const result = await this.em.transactional(async (em) => {
			await this.data.findParentEntity(em, dto.parentId, true);
			const code = dto.code ?? null;
			const routeName = dto.routeName ?? null;
			await this.assertUniqueValues(em, code, routeName);

			const entity = em.create(MenuEntity, {
				type: dto.type,
				parentId: dto.parentId ?? null,
				name: dto.name,
				code,
				routeName,
				path: dto.path ?? null,
				component: dto.component ?? null,
				redirect: dto.redirect ?? null,
				icon: dto.icon ?? null,
				sort: dto.sort ?? 0,
				visible: dto.visible ?? true,
				keepAlive: dto.type === MenuType.PAGE ? (dto.keepAlive ?? false) : null,
			});
			try {
				await em.flush();
			} catch (error) {
				if (error instanceof UniqueConstraintViolationException) {
					throw new ConflictException("菜单编码或路由名称已存在");
				}
				throw error;
			}
			return this.data.toMenuResult(entity);
		});
		await this.accessInvalidation.invalidateMenu(result.id);
		return result;
	}

	/** 查询未删除菜单；不传分页参数时返回全部菜单。 */
	async findMenus(query: QueryMenuDto): Promise<PageResult<MenuResult>> {
		const where: FilterQuery<MenuEntity> = { deletedAt: null };
		if (query.type !== undefined) where.type = query.type;
		if (query.parentId !== undefined) where.parentId = query.parentId;
		if (query.name) where.name = { $ilike: `%${query.name}%` };
		if (query.code) where.code = { $ilike: `%${query.code}%` };
		if (query.path) where.path = { $ilike: `%${query.path}%` };
		if (query.visible !== undefined) where.visible = query.visible;

		const fields = [
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
		] as const;
		const orderBy = { sort: "asc", id: "asc" } as const;
		const shouldPaginate = query.page !== undefined || query.pageSize !== undefined;
		if (!shouldPaginate) {
			const entities = await this.em.find(MenuEntity, where, {
				fields,
				orderBy,
			});
			return {
				items: entities.map((entity) => this.data.toMenuResult(entity)),
				total: entities.length,
				page: DEFAULT_PAGE,
				pageSize: entities.length,
			};
		}

		const page = query.page ?? DEFAULT_PAGE;
		const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
		const [entities, total] = await this.em.findAndCount(MenuEntity, where, {
			fields,
			...getOffsetPagination({ page, pageSize }),
			orderBy,
		});

		return {
			items: entities.map((entity) => this.data.toMenuResult(entity)),
			total,
			page,
			pageSize,
		};
	}

	/** 按主键查询未删除菜单，不存在则 404。 */
	async findMenu(id: number): Promise<MenuResult> {
		return this.data.toMenuResult(await this.data.findMenuEntity(this.em, id));
	}

	/** 更新菜单字段；菜单类型创建后不允许改变。 */
	async updateMenu(id: number, dto: UpdateMenuDto): Promise<MenuResult> {
		const result = await this.em.transactional(async (em) => {
			const entity = await this.data.findMenuEntity(em, id, true);
			this.assertUpdateFields(entity.type, dto);

			if (dto.parentId !== undefined && dto.parentId !== entity.parentId) {
				const parent = await this.data.findParentEntity(em, dto.parentId, true);
				if (parent && (await this.data.isDescendant(em, entity.id, parent.id))) {
					throw new BadRequestException("不能将菜单移动到自身或其下级菜单下");
				}
				entity.parentId = parent?.id ?? null;
			}
			if (dto.code !== undefined || dto.routeName !== undefined) {
				const code = dto.code !== undefined ? dto.code : entity.code;
				const routeName = dto.routeName !== undefined ? dto.routeName : entity.routeName;
				await this.assertUniqueValues(em, code ?? null, routeName ?? null, entity.id);
			}

			if (dto.name !== undefined) entity.name = dto.name;
			if (dto.code !== undefined) entity.code = dto.code ?? null;
			if (dto.routeName !== undefined) entity.routeName = dto.routeName ?? null;
			if (dto.path !== undefined) entity.path = dto.path ?? null;
			if (dto.component !== undefined) entity.component = dto.component ?? null;
			if (dto.redirect !== undefined) entity.redirect = dto.redirect ?? null;
			if (dto.icon !== undefined) entity.icon = dto.icon ?? null;
			if (dto.sort !== undefined) entity.sort = dto.sort;
			if (dto.visible !== undefined) entity.visible = dto.visible;
			if (dto.keepAlive !== undefined) entity.keepAlive = dto.keepAlive ?? null;

			try {
				await em.flush();
			} catch (error) {
				if (error instanceof UniqueConstraintViolationException) {
					throw new ConflictException("菜单编码或路由名称已存在");
				}
				throw error;
			}
			return this.data.toMenuResult(entity);
		});
		await this.accessInvalidation.invalidateMenu(id);
		return result;
	}

	/** 软删除菜单；存在有效子菜单时不能删除。 */
	async removeMenu(id: number): Promise<MenuResult> {
		const result = await this.em.transactional(async (em) => {
			const entity = await this.data.findMenuEntity(em, id, true);
			if (await this.data.hasActiveChildren(em, entity.id)) {
				throw new ConflictException("存在有效子菜单，不能删除当前菜单");
			}
			await this.accessInvalidation.invalidateMenu(entity.id);
			await this.roleMenus.clearMenuRoles(em, entity.id);

			const now = new Date();
			entity.deletedAt = now;
			entity.updatedAt = now;
			await em.flush();
			return this.data.toMenuResult(entity);
		});
		await this.accessInvalidation.invalidateMenu(id);
		return result;
	}
}
