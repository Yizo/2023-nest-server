import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { type FilterQuery, LockMode, UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { getOffsetPagination, type PageResult } from "@/common/pagination";
import { UserDataService } from "@/modules/user/user-data.service";
import { CreateRoleDto, QueryRoleDto, RoleResult, UpdateRoleDto } from "./dto";
import { RoleEntity } from "./entities";
import { DataScope, SUPER_ADMIN_ROLE_CODE } from "./role.constants";

type RoleView = Pick<
	RoleEntity,
	"id" | "roleName" | "roleCode" | "dataScope" | "status" | "remark" | "createdAt" | "updatedAt"
>;

@Injectable()
export class RoleService {
	constructor(
		private readonly em: EntityManager,
		private readonly userData: UserDataService,
	) {}

	// 公共方法

	/** 角色实体转接口返回，不含 deletedAt。 */
	private toRoleResult(entity: RoleView): RoleResult {
		return {
			id: entity.id,
			roleName: entity.roleName,
			roleCode: entity.roleCode,
			dataScope: entity.dataScope,
			status: entity.status,
			remark: entity.remark ?? null,
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
	): Promise<RoleEntity> {
		const entity = await em.findOne(
			RoleEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"roleName",
					"roleCode",
					"dataScope",
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

	/** 系统角色只能由初始化流程维护，角色接口只允许操作普通角色。 */
	private assertRoleCanBeManaged(entity: Pick<RoleEntity, "roleCode">): void {
		if (entity.roleCode === SUPER_ADMIN_ROLE_CODE) {
			throw new ForbiddenException("超级管理员角色只能由系统初始化维护");
		}
	}

	// 角色方法

	/** 创建有效角色；角色编码创建后不可修改。 */
	async createRole(dto: CreateRoleDto): Promise<RoleResult> {
		const roleCode = dto.roleCode.trim().toLowerCase();
		if (roleCode === SUPER_ADMIN_ROLE_CODE) {
			throw new ForbiddenException("超级管理员角色只能由系统初始化创建");
		}
		if (await this.em.findOne(RoleEntity, { roleCode, deletedAt: null }, { fields: ["id"] })) {
			throw new ConflictException("角色编码已存在");
		}

		const entity = this.em.create(RoleEntity, {
			roleName: dto.roleName,
			roleCode,
			dataScope: dto.dataScope ?? DataScope.NONE,
			status: dto.status ?? 1,
			remark: dto.remark ?? null,
		});
		try {
			await this.em.persist(entity).flush();
		} catch (error) {
			if (error instanceof UniqueConstraintViolationException) {
				throw new ConflictException("角色编码已存在");
			}
			throw error;
		}
		return this.toRoleResult(entity);
	}

	/** 分页查询未删除角色。 */
	async findRoles(query: QueryRoleDto): Promise<PageResult<RoleResult>> {
		const where: FilterQuery<RoleEntity> = { deletedAt: null };
		if (query.roleName) where.roleName = { $ilike: `%${query.roleName}%` };
		if (query.roleCode) where.roleCode = { $ilike: `%${query.roleCode}%` };
		if (query.dataScope) where.dataScope = query.dataScope;
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(RoleEntity, where, {
			fields: [
				"id",
				"roleName",
				"roleCode",
				"dataScope",
				"status",
				"remark",
				"createdAt",
				"updatedAt",
			],
			...getOffsetPagination(query),
			orderBy: { createdAt: "desc", id: "desc" },
		});
		return {
			items: entities.map((entity) => this.toRoleResult(entity)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	/** 按主键查询未删除角色，不存在则 404。 */
	async findRole(id: number): Promise<RoleResult> {
		return this.toRoleResult(await this.findRoleEntity(this.em, id));
	}

	/** 更新角色名称、数据范围、状态和备注，不允许修改角色编码。 */
	async updateRole(id: number, dto: UpdateRoleDto): Promise<RoleResult> {
		const entity = await this.findRoleEntity(this.em, id);
		this.assertRoleCanBeManaged(entity);
		if (dto.roleName !== undefined) entity.roleName = dto.roleName;
		if (dto.dataScope !== undefined) entity.dataScope = dto.dataScope;
		if (dto.status !== undefined) entity.status = dto.status;
		if (dto.remark !== undefined) entity.remark = dto.remark;
		await this.em.flush();
		return this.toRoleResult(entity);
	}

	/** 软删除角色；超级管理员或仍被用户使用的角色不能删除。 */
	async removeRole(id: number): Promise<RoleResult> {
		return this.em.transactional(async (em) => {
			const entity = await this.findRoleEntity(em, id, true);
			this.assertRoleCanBeManaged(entity);
			if (await this.userData.isRoleAssigned(em, entity.id)) {
				throw new ConflictException("角色仍被用户使用，不能删除");
			}

			const now = new Date();
			entity.deletedAt = now;
			entity.updatedAt = now;
			await em.flush();
			return this.toRoleResult(entity);
		});
	}

}
