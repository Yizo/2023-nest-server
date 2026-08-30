import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
	type FilterQuery,
	LoadStrategy,
	LockMode,
	UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { getOffsetPagination, type PageResult } from "@/common/pagination";
import {
	CreateDictDataDto,
	CreateDictTypeDto,
	DictDataResult,
	DictTypeResult,
	QueryDictDataDto,
	QueryDictTypeDto,
	UpdateDictDataDto,
	UpdateDictTypeDto,
} from "./dto";
import { DictDataEntity, DictTypeEntity } from "./entities";

type DictTypeView = Pick<
	DictTypeEntity,
	"id" | "dictName" | "dictType" | "status" | "remark" | "createdAt" | "updatedAt"
>;
type DictDataView = Pick<
	DictDataEntity,
	"id" | "label" | "value" | "sort" | "status" | "remark" | "createdAt" | "updatedAt"
>;

@Injectable()
export class DictService {
	constructor(private readonly em: EntityManager) {}

	// 公共方法

	/** 类型实体转接口返回，不含 deletedAt。 */
	private toTypeResult(entity: DictTypeView): DictTypeResult {
		return {
			id: entity.id,
			dictName: entity.dictName,
			dictType: entity.dictType,
			status: entity.status,
			remark: entity.remark ?? null,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	/** 数据实体转接口返回；dictType 用编码字符串，不暴露类型实体。 */
	private toDataResult(entity: DictDataView, dictType: string): DictDataResult {
		return {
			id: entity.id,
			dictType,
			label: entity.label,
			value: entity.value,
			sort: entity.sort,
			status: entity.status,
			remark: entity.remark ?? null,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	// 数据方法

	/** 按 id 取未删除的类型；lockForWrite 时锁定类型，避免删除和新增数据并发冲突。 */
	private async findTypeEntity(
		em: EntityManager,
		id: number,
		lockForWrite = false,
	): Promise<DictTypeEntity> {
		const entity = await em.findOne(
			DictTypeEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"dictName",
					"dictType",
					"status",
					"remark",
					"createdAt",
					"updatedAt",
					"deletedAt",
				],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("字典类型不存在");
		return entity;
	}

	/** 按编码取未删除类型；创建数据时需要锁定父类型。 */
	private async findTypeByCode(
		em: EntityManager,
		dictType: string,
		lockForWrite = false,
	): Promise<DictTypeEntity> {
		const entity = await em.findOne(
			DictTypeEntity,
			{ dictType, deletedAt: null },
			{
				fields: ["id", "dictType"],
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("字典类型不存在");
		return entity as DictTypeEntity;
	}

	/** 按 id 取未删除的数据，并确认所属类型仍然有效。 */
	private async findDataEntity(em: EntityManager, dataId: number): Promise<DictDataEntity> {
		const entity = await em.findOne(
			DictDataEntity,
			{
				id: dataId,
				deletedAt: null,
				dictType: { deletedAt: null },
			},
			{
				populate: ["dictType"],
				strategy: LoadStrategy.JOINED,
				fields: [
					"id",
					"label",
					"value",
					"sort",
					"status",
					"remark",
					"createdAt",
					"updatedAt",
					"dictType.id",
					"dictType.dictType",
				],
			},
		);
		if (!entity) throw new NotFoundException("字典数据不存在");
		return entity as DictDataEntity;
	}

	/** 检查同一字典类型下的 value 是否已经被其他有效数据使用。 */
	private async assertDataValueUnique(
		em: EntityManager,
		type: DictTypeEntity,
		value: string,
		excludedDataId?: number,
	): Promise<void> {
		const where: FilterQuery<DictDataEntity> = { dictType: type, value, deletedAt: null };
		if (excludedDataId !== undefined) where.id = { $ne: excludedDataId };
		const existing = await em.findOne(DictDataEntity, where, { fields: ["id"] });
		if (existing) throw new ConflictException("同一字典类型下的字典值已存在");
	}

	// 字典类型方法

	/** 创建字典类型。先查后插，flush 时再用唯一约束兜并发重复。编码创建后不可改。 */
	async createType(dto: CreateDictTypeDto): Promise<DictTypeResult> {
		if (
			await this.em.findOne(
				DictTypeEntity,
				{ dictType: dto.dictType, deletedAt: null },
				{ fields: ["id"] },
			)
		) {
			throw new ConflictException("字典类型已存在");
		}

		const entity = this.em.create(DictTypeEntity, {
			dictName: dto.dictName,
			dictType: dto.dictType,
			status: dto.status ?? 1,
			remark: dto.remark ?? null,
		});
		try {
			await this.em.persist(entity).flush();
		} catch (error) {
			if (error instanceof UniqueConstraintViolationException) {
				throw new ConflictException("字典类型已存在");
			}
			throw error;
		}
		return this.toTypeResult(entity);
	}

	/** 分页查询未删除的字典类型，按名称/编码模糊搜，按创建时间倒序。 */
	async findTypes(query: QueryDictTypeDto): Promise<PageResult<DictTypeResult>> {
		const where: FilterQuery<DictTypeEntity> = { deletedAt: null };
		if (query.dictName) where.dictName = { $ilike: `%${query.dictName}%` };
		if (query.dictType) where.dictType = { $ilike: `%${query.dictType}%` };
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(DictTypeEntity, where, {
			fields: ["id", "dictName", "dictType", "status", "remark", "createdAt", "updatedAt"],
			...getOffsetPagination(query),
			orderBy: { createdAt: "desc", id: "desc" },
		});
		return {
			items: entities.map((entity) => this.toTypeResult(entity)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	/** 按主键查单条未删除的字典类型，不存在则 404。 */
	async findType(id: number): Promise<DictTypeResult> {
		return this.toTypeResult(await this.findTypeEntity(this.em, id));
	}

	/** 更新类型名称、状态、备注。不改 dictType 编码，只 flush 脏字段。 */
	async updateType(id: number, dto: UpdateDictTypeDto): Promise<DictTypeResult> {
		const entity = await this.findTypeEntity(this.em, id);
		if (dto.dictName !== undefined) entity.dictName = dto.dictName;
		if (dto.status !== undefined) entity.status = dto.status;
		if (dto.remark !== undefined) entity.remark = dto.remark;
		await this.em.flush();
		return this.toTypeResult(entity);
	}

	/**
	 * 软删字典类型，并批量软删其下仍有效的字典数据。
	 * 事务内对类型行 FOR UPDATE，与 createData 抢同一把锁，避免删的同时再插入。
	 */
	async removeType(id: number): Promise<DictTypeResult> {
		return this.em.transactional(async (em) => {
			const type = await this.findTypeEntity(em, id, true);
			const now = new Date();
			await em.nativeUpdate(
				DictDataEntity,
				{ dictType: type, deletedAt: null },
				{ deletedAt: now, updatedAt: now },
			);
			type.deletedAt = now;
			type.updatedAt = now;
			await em.flush();
			return this.toTypeResult(type);
		});
	}

	// 字典数据方法

	/**
	 * 在指定类型下创建字典数据。只关联已查询并锁定的类型实体，关系本身关闭 cascade。
	 * 锁父类型后再校验 value，唯一约束兜并发撞值。
	 */
	async createData(dto: CreateDictDataDto): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const type = await this.findTypeByCode(em, dto.dictType, true);
			await this.assertDataValueUnique(em, type, dto.value);
			const data = em.create(DictDataEntity, {
				dictType: type,
				label: dto.label,
				value: dto.value,
				sort: dto.sort ?? 0,
				status: dto.status ?? 1,
				remark: dto.remark ?? null,
			});
			try {
				await em.persist(data).flush();
			} catch (error) {
				if (error instanceof UniqueConstraintViolationException) {
					throw new ConflictException("同一字典类型下的字典值已存在");
				}
				throw error;
			}
			return this.toDataResult(data, type.dictType);
		});
	}

	/** 按类型编码分页查未删除的字典数据，按 sort、id 升序。 */
	async findDataList(query: QueryDictDataDto): Promise<PageResult<DictDataResult>> {
		const type = await this.findTypeByCode(this.em, query.dictType);
		const where: FilterQuery<DictDataEntity> = { dictType: type, deletedAt: null };
		if (query.label) where.label = { $ilike: `%${query.label}%` };
		if (query.value) where.value = { $ilike: `%${query.value}%` };
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(DictDataEntity, where, {
			fields: ["id", "label", "value", "sort", "status", "remark", "createdAt", "updatedAt"],
			...getOffsetPagination(query),
			orderBy: { sort: "asc", id: "asc" },
		});
		return {
			items: entities.map((entity) => this.toDataResult(entity, type.dictType)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	/** 按主键查单条未删除的字典数据；所属类型已删则视为不存在。 */
	async findData(id: number): Promise<DictDataResult> {
		const data = await this.findDataEntity(this.em, id);
		return this.toDataResult(data, data.dictType.dictType);
	}

	/** 更新字典数据。改 value 时锁所属类型并排除自身做占用检查；不可改所属类型。 */
	async updateData(id: number, dto: UpdateDictDataDto): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const data = await this.findDataEntity(em, id);
			if (dto.value !== undefined && dto.value !== data.value) {
				await em.lock(data.dictType, LockMode.PESSIMISTIC_WRITE);
				await this.assertDataValueUnique(em, data.dictType, dto.value, data.id);
				data.value = dto.value;
			}
			if (dto.label !== undefined) data.label = dto.label;
			if (dto.sort !== undefined) data.sort = dto.sort;
			if (dto.status !== undefined) data.status = dto.status;
			if (dto.remark !== undefined) data.remark = dto.remark;
			try {
				await em.flush();
			} catch (error) {
				if (error instanceof UniqueConstraintViolationException) {
					throw new ConflictException("同一字典类型下的字典值已存在");
				}
				throw error;
			}
			return this.toDataResult(data, data.dictType.dictType);
		});
	}

	/** 软删单条字典数据，不处理所属类型。 */
	async removeData(id: number): Promise<DictDataResult> {
		const data = await this.findDataEntity(this.em, id);
		const now = new Date();
		data.deletedAt = now;
		data.updatedAt = now;
		await this.em.flush();
		return this.toDataResult(data, data.dictType.dictType);
	}

}
