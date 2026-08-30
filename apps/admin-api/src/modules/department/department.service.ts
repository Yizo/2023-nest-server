import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { type FilterQuery, LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { getOffsetPagination, type PageResult } from "@/common/pagination";
import { UserDataService } from "@/modules/user/user-data.service";
import {
	CreateDepartmentDto,
	DepartmentResult,
	QueryDepartmentDto,
	UpdateDepartmentDto,
} from "./dto";
import { DepartmentEntity } from "./entities";

type DepartmentView = Pick<
	DepartmentEntity,
	"id" | "deptName" | "parentId" | "ancestors" | "sort" | "status" | "createdAt" | "updatedAt"
>;
type DepartmentPathView = Pick<DepartmentEntity, "id" | "ancestors">;

@Injectable()
export class DepartmentService {
	constructor(
		private readonly em: EntityManager,
		private readonly userData: UserDataService,
	) {}

	// 公共方法

	/** 部门实体转接口返回，不暴露 deletedAt。 */
	private toDepartmentResult(entity: DepartmentView): DepartmentResult {
		return {
			id: entity.id,
			deptName: entity.deptName,
			parentId: entity.parentId ?? null,
			ancestors: entity.ancestors,
			sort: entity.sort,
			status: entity.status,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	/** 将父部门路径和父部门 ID 拼为当前部门的祖级列表。 */
	private buildAncestors(parentAncestors: string, parentId: number): string {
		return parentAncestors ? `${parentAncestors},${parentId}` : String(parentId);
	}

	// 数据方法

	/** 查询有效父部门；根部门不需要父实体。 */
	private async findParentEntity(
		em: EntityManager,
		parentId: number | null | undefined,
		lockForWrite = false,
	): Promise<DepartmentPathView | null> {
		if (parentId == null) return null;

		const entity = await em.findOne(
			DepartmentEntity,
			{ id: parentId, deletedAt: null },
			{
				fields: ["id", "ancestors"],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("父部门不存在");
		return entity;
	}

	/** 按主键取未删除部门；lockForWrite 只能在事务内使用。 */
	private async findDepartmentEntity(
		em: EntityManager,
		id: number,
		lockForWrite = false,
	): Promise<DepartmentEntity> {
		const entity = await em.findOne(
			DepartmentEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"deptName",
					"parentId",
					"ancestors",
					"sort",
					"status",
					"createdAt",
					"updatedAt",
					"deletedAt",
				],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("部门不存在");
		return entity;
	}

	/** 禁止将部门移动到自身或自身后代下，避免形成环。 */
	private assertValidParent(
		entity: Pick<DepartmentEntity, "id">,
		parent: DepartmentPathView | null,
	): void {
		if (!parent) return;
		if (parent.id === entity.id || parent.ancestors.split(",").includes(String(entity.id))) {
			throw new BadRequestException("不能将部门移动到自身或其子部门下");
		}
	}

	/** 直接让数据库一次更新所有下属部门的祖级列表，避免把整棵树读进内存。 */
	private async updateDescendantAncestors(
		em: EntityManager,
		entityId: number,
		oldAncestors: string,
		newAncestors: string,
	): Promise<void> {
		const oldPath = this.buildAncestors(oldAncestors, entityId);
		const newPath = this.buildAncestors(newAncestors, entityId);

		/*
		 * 让数据库一次更新所有下属部门，不把后代节点全部查到应用内：
		 * 1. ancestors 等于 oldPath 的，是当前部门的直接子部门；
		 * 2. ancestors 以 oldPath 加逗号开头的，是更深层的后代；
		 * 3. 去掉每条旧路径的 oldPath，再接上 newPath；
		 * 4. 同步更新这些后代的更新时间。
		 * 路径值通过参数占位符传入，避免把数据直接拼接进 SQL。
		 */
		await em.execute(
			`UPDATE "sys_dept"
			 SET "ancestors" = ? || SUBSTRING("ancestors" FROM LENGTH(?) + 1),
			     "updated_at" = CURRENT_TIMESTAMP
			 WHERE "deleted_at" IS NULL
			   AND ("ancestors" = ? OR "ancestors" LIKE ? || ',%')`,
			[newPath, oldPath, oldPath, oldPath],
			"run",
		);
	}

	// 部门方法

	/** 创建部门；父部门存在时锁定父行后计算祖级列表。 */
	async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentResult> {
		return this.em.transactional(async (em) => {
			const parent = await this.findParentEntity(em, dto.parentId, true);
			const entity = em.create(DepartmentEntity, {
				deptName: dto.deptName,
				parentId: parent?.id ?? null,
				ancestors: parent ? this.buildAncestors(parent.ancestors, parent.id) : "",
				sort: dto.sort ?? 0,
				status: dto.status ?? 1,
			});
			await em.persist(entity).flush();
			return this.toDepartmentResult(entity);
		});
	}

	/** 分页查询未删除部门，按祖级路径、排序和主键稳定排序。 */
	async findDepartments(query: QueryDepartmentDto): Promise<PageResult<DepartmentResult>> {
		const where: FilterQuery<DepartmentEntity> = { deletedAt: null };
		if (query.deptName) where.deptName = { $ilike: `%${query.deptName}%` };
		if (query.parentId !== undefined) where.parentId = query.parentId;
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(DepartmentEntity, where, {
			fields: [
				"id",
				"deptName",
				"parentId",
				"ancestors",
				"sort",
				"status",
				"createdAt",
				"updatedAt",
			],
			...getOffsetPagination(query),
			orderBy: { ancestors: "asc", sort: "asc", id: "asc" },
		});

		return {
			items: entities.map((entity) => this.toDepartmentResult(entity)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	/** 按主键查询未删除部门，不存在则 404。 */
	async findDepartment(id: number): Promise<DepartmentResult> {
		return this.toDepartmentResult(await this.findDepartmentEntity(this.em, id));
	}

	/** 更新部门；移动节点时同步更新该节点及所有有效后代的祖级列表。 */
	async updateDepartment(id: number, dto: UpdateDepartmentDto): Promise<DepartmentResult> {
		return this.em.transactional(async (em) => {
			const entity = await this.findDepartmentEntity(em, id, true);

			// 只有传了新的父部门，而且新旧父部门不一样时，才处理部门移动；传 null 表示移动到根部门。
			if (dto.parentId !== undefined && dto.parentId !== entity.parentId) {
				const parent = await this.findParentEntity(em, dto.parentId, true);
				this.assertValidParent(entity, parent);
				const newAncestors = parent ? this.buildAncestors(parent.ancestors, parent.id) : "";

				await this.updateDescendantAncestors(em, entity.id, entity.ancestors, newAncestors);
				entity.parentId = parent?.id ?? null;
				entity.ancestors = newAncestors;
			}

			if (dto.deptName !== undefined) entity.deptName = dto.deptName;
			if (dto.sort !== undefined) entity.sort = dto.sort;
			if (dto.status !== undefined) entity.status = dto.status;
			await em.flush();
			return this.toDepartmentResult(entity);
		});
	}

	/** 软删除部门；存在有效子部门或关联用户时拒绝删除。 */
	async removeDepartment(id: number): Promise<DepartmentResult> {
		return this.em.transactional(async (em) => {
			const entity = await this.findDepartmentEntity(em, id, true);
			const child = await em.findOne(
				DepartmentEntity,
				{ parentId: entity.id, deletedAt: null },
				{ fields: ["id"] },
			);
			if (child) throw new ConflictException("存在有效子部门，不能删除当前部门");
			if (await this.userData.isDepartmentAssigned(em, entity.id)) {
				throw new ConflictException("部门仍有关联用户，不能删除当前部门");
			}

			const now = new Date();
			entity.deletedAt = now;
			entity.updatedAt = now;
			await em.flush();
			return this.toDepartmentResult(entity);
		});
	}
}
