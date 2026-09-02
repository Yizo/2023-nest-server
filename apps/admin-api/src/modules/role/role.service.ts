import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import {
	type FilterQuery,
	LoadStrategy,
	LockMode,
	UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { getOffsetPagination, type PageResult } from "@/common/pagination";
import { getIdDiff, normalizeIds } from "@/common/utils";
import { AccessInvalidation } from "@/modules/access/access-invalidation.service";
import { RoleMenuDataService } from "./role-menu-data.service";
import { UserQuery } from "@/modules/user/user-query.service";
import { CreateRoleDto, QueryRoleDto, RoleResult, UpdateRoleDto } from "./dto";
import { RoleEntity } from "./entities";
import { SUPER_ADMIN_ROLE_CODE } from "./role.constants";

type RoleView = Pick<
	RoleEntity,
	"id" | "roleName" | "roleCode" | "status" | "remark" | "createdAt" | "updatedAt"
>;
type RoleWriteEntity = RoleView & Pick<RoleEntity, "deletedAt">;

@Injectable()
export class RoleService {
	constructor(
		private readonly em: EntityManager,
		private readonly userQuery: UserQuery,
		private readonly roleMenus: RoleMenuDataService,
		private readonly accessInvalidation: AccessInvalidation,
	) {}

	// 公共方法

	/** 角色实体转接口返回，不含 deletedAt。 */
	private toRoleResult(entity: RoleView, menuIds: number[]): RoleResult {
		return {
			id: entity.id,
			roleName: entity.roleName,
			roleCode: entity.roleCode,
			status: entity.status,
			remark: entity.remark ?? null,
			menuIds: [...menuIds].sort((left, right) => left - right),
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	// 数据方法

	/** 按主键取未删除角色；删除时锁定角色，避免同时继续分配该角色。 */
	private async findRoleEntity(
		em: EntityManager,
		id: number,
		lockForWrite = false,
	): Promise<RoleWriteEntity> {
		const entity = await em.findOne(
			RoleEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"roleName",
					"roleCode",
					"status",
					"remark",
					"createdAt",
					"updatedAt",
					"deletedAt",
				],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("角色不存在");
		return entity;
	}

	/** 查询角色公开字段，并加载角色拥有的菜单和操作 ID。 */
	private async findRoleViewEntity(em: EntityManager, id: number) {
		const entity = await em.findOne(
			RoleEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"roleName",
					"roleCode",
					"status",
					"remark",
					"createdAt",
					"updatedAt",
					"menus.id",
				],
				populate: ["menus:ref"],
				populateWhere: { deletedAt: null },
				strategy: LoadStrategy.SELECT_IN,
			},
		);
		if (!entity) throw new NotFoundException("角色不存在");
		return entity;
	}

	/** 系统角色只能由初始化流程维护，角色接口只允许操作普通角色。 */
	private assertRoleCanBeManaged(entity: Pick<RoleEntity, "roleCode">): void {
		if (entity.roleCode === SUPER_ADMIN_ROLE_CODE) {
			throw new ForbiddenException("超级管理员角色只能由系统初始化维护");
		}
	}

	/** 修改角色菜单；只删除移除的菜单，只新增新分配的菜单。 */
	private async replaceMenus(em: EntityManager, roleId: number, menuIds: unknown): Promise<number[]> {
		const targetIds = normalizeIds(menuIds, "菜单 ID");
		await this.roleMenus.assertMenusAvailable(em, targetIds);
		const currentIds = await this.roleMenus.findMenuIds(em, roleId);
		const { toAdd, toRemove } = getIdDiff(currentIds, targetIds);

		await this.roleMenus.removeRoleMenus(em, roleId, toRemove);
		await this.roleMenus.addRoleMenus(em, roleId, toAdd);
		return targetIds;
	}

	// 角色方法

	/** 创建有效角色；角色编码创建后不可修改。 */
	async createRole(dto: CreateRoleDto): Promise<RoleResult> {
		const roleCode = dto.roleCode.trim().toLowerCase();
		if (roleCode === SUPER_ADMIN_ROLE_CODE) {
			throw new ForbiddenException("超级管理员角色只能由系统初始化创建");
		}

		return this.em.transactional(async (em) => {
			if (await em.findOne(RoleEntity, { roleCode, deletedAt: null }, { fields: ["id"] })) {
				throw new ConflictException("角色编码已存在");
			}

			const entity = em.create(RoleEntity, {
				roleName: dto.roleName,
				roleCode,
				status: dto.status ?? 1,
				remark: dto.remark ?? null,
			});
			try {
				await em.flush();
			} catch (error) {
				if (error instanceof UniqueConstraintViolationException) {
					throw new ConflictException("角色编码已存在");
				}
				throw error;
			}

			const menuIds =
				dto.menuIds === undefined ? [] : await this.replaceMenus(em, entity.id, dto.menuIds);
			return this.toRoleResult(entity, menuIds);
		});
	}

	/** 分页查询未删除角色。 */
	async findRoles(query: QueryRoleDto): Promise<PageResult<RoleResult>> {
		const where: FilterQuery<RoleEntity> = { deletedAt: null };
		if (query.roleName) where.roleName = { $ilike: `%${query.roleName}%` };
		if (query.roleCode) where.roleCode = { $ilike: `%${query.roleCode}%` };
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(RoleEntity, where, {
			fields: [
				"id",
				"roleName",
				"roleCode",
				"status",
				"remark",
				"createdAt",
				"updatedAt",
				"menus.id",
			],
			...getOffsetPagination(query),
			orderBy: { createdAt: "desc", id: "desc" },
			populate: ["menus:ref"],
			populateWhere: { deletedAt: null },
			strategy: LoadStrategy.SELECT_IN,
		});
		return {
			items: entities.map((entity) =>
				this.toRoleResult(entity, entity.menus.getIdentifiers<number>()),
			),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	/** 按主键查询未删除角色，不存在则 404。 */
	async findRole(id: number): Promise<RoleResult> {
		const entity = await this.findRoleViewEntity(this.em, id);
		return this.toRoleResult(entity, entity.menus.getIdentifiers<number>());
	}

	/** 更新角色名称、状态和备注，不允许修改角色编码。 */
	async updateRole(id: number, dto: UpdateRoleDto): Promise<RoleResult> {
		const result = await this.em.transactional(async (em) => {
			const entity = await this.findRoleEntity(em, id, true);
			this.assertRoleCanBeManaged(entity);
			if (dto.roleName !== undefined) entity.roleName = dto.roleName;
			if (dto.status !== undefined) entity.status = dto.status;
			if (dto.remark !== undefined) entity.remark = dto.remark;
			const menuIds =
				dto.menuIds === undefined
					? await this.roleMenus.findMenuIds(em, entity.id)
					: await this.replaceMenus(em, entity.id, dto.menuIds);

			await em.flush();
			return this.toRoleResult(entity, menuIds);
		});
		await this.accessInvalidation.invalidateRole(id);
		return result;
	}

	/** 软删除角色；超级管理员或仍被用户使用的角色不能删除。 */
	async removeRole(id: number): Promise<RoleResult> {
		return this.em.transactional(async (em) => {
			const entity = await this.findRoleEntity(em, id, true);
			this.assertRoleCanBeManaged(entity);
			if (await this.userQuery.isRoleAssigned(em, entity.id)) {
				throw new ConflictException("角色仍被用户使用，不能删除");
			}
			await this.roleMenus.clearRoleMenus(em, entity.id);

			const now = new Date();
			entity.deletedAt = now;
			entity.updatedAt = now;
			await em.flush();
			return this.toRoleResult(entity, []);
		});
	}

}
