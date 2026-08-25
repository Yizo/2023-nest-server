import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
	type FilterQuery,
	LoadStrategy,
	LockMode,
	UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import {
	CreateDictDataDto,
	CreateDictTypeDto,
	QueryDictDataDto,
	QueryDictTypeDto,
	UpdateDictDataDto,
	UpdateDictTypeDto,
} from "./dto";
import { DictDataEntity, DictTypeDataEntity, DictTypeEntity } from "./entities";

export interface DictTypeResult {
	id: number;
	dictName: string;
	dictType: string;
	status: 0 | 1;
	remark: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface DictDataResult {
	id: number;
	dictType: string;
	label: string;
	value: string;
	sort: number;
	status: 0 | 1;
	remark: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface DictPageResult<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
}

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

	async createType(dto: CreateDictTypeDto): Promise<DictTypeResult> {
		if (await this.em.findOne(
			DictTypeEntity,
			{ dictType: dto.dictType, deletedAt: null },
			{ fields: ["id"] },
		)) {
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

	async findTypes(query: QueryDictTypeDto): Promise<DictPageResult<DictTypeResult>> {
		const where: FilterQuery<DictTypeEntity> = { deletedAt: null };
		if (query.dictName) where.dictName = { $ilike: `%${query.dictName}%` };
		if (query.dictType) where.dictType = { $ilike: `%${query.dictType}%` };
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(DictTypeEntity, where, {
			fields: ["id", "dictName", "dictType", "status", "remark", "createdAt", "updatedAt"],
			limit: query.pageSize,
			offset: (query.page - 1) * query.pageSize,
			orderBy: { createdAt: "desc", id: "desc" },
		});
		return {
			items: entities.map((entity) => this.toTypeResult(entity)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	async findType(id: number): Promise<DictTypeResult> {
		return this.toTypeResult(await this.findTypeEntity(this.em, id));
	}

	async updateType(id: number, dto: UpdateDictTypeDto): Promise<DictTypeResult> {
		const entity = await this.findTypeEntity(this.em, id);
		if (dto.dictName !== undefined) entity.dictName = dto.dictName;
		if (dto.status !== undefined) entity.status = dto.status;
		if (dto.remark !== undefined) entity.remark = dto.remark;
		await this.em.flush();
		return this.toTypeResult(entity);
	}

	async removeType(id: number): Promise<DictTypeResult> {
		return this.em.transactional(async (em) => {
			const type = await this.findTypeEntity(em, id);
			const relations = await em.find(
				DictTypeDataEntity,
				{ dictType: type, dictData: { deletedAt: null }, deletedAt: null },
				{ fields: ["id", "dictData.id"] },
			);
			const now = new Date();
			const relationIds = relations.map((relation) => relation.id);
			const dataIds = relations.map((relation) => relation.dictData.id);

			// 没有数据库外键时，三张表的软删除必须在同一事务中完成，避免留下有效孤立关联。
			if (relationIds.length > 0) {
				await em.nativeUpdate(
					DictTypeDataEntity,
					{ id: { $in: relationIds }, deletedAt: null },
					{ deletedAt: now, updatedAt: now },
				);
				await em.nativeUpdate(
					DictDataEntity,
					{ id: { $in: dataIds }, deletedAt: null },
					{ deletedAt: now, updatedAt: now },
				);
			}
			type.deletedAt = now;
			type.updatedAt = now;
			await em.flush();
			return this.toTypeResult(type);
		});
	}

	async createData(dto: CreateDictDataDto): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const type = await this.findTypeByCode(em, dto.dictType, true);
			await this.assertDataValueAvailable(em, type, dto.value);
			const data = em.create(DictDataEntity, {
				label: dto.label,
				value: dto.value,
				sort: dto.sort ?? 0,
				status: dto.status ?? 1,
				remark: dto.remark ?? null,
			});
			const relation = em.create(DictTypeDataEntity, { dictType: type, dictData: data });
			em.persist([data, relation]);
			await em.flush();
			return this.toDataResult(data, type.dictType);
		});
	}

	async findDataList(query: QueryDictDataDto): Promise<DictPageResult<DictDataResult>> {
		const type = await this.findTypeByCode(this.em, query.dictType);
		const dataWhere: FilterQuery<DictDataEntity> = { deletedAt: null };
		if (query.label) dataWhere.label = { $ilike: `%${query.label}%` };
		if (query.value) dataWhere.value = { $ilike: `%${query.value}%` };
		if (query.status !== undefined) dataWhere.status = query.status;

		const [relations, total] = await this.em.findAndCount(
			DictTypeDataEntity,
			{ dictType: type, dictData: dataWhere, deletedAt: null },
			{
				populate: ["dictData"],
				strategy: LoadStrategy.JOINED,
				fields: [
					"id",
					"dictData.id",
					"dictData.label",
					"dictData.value",
					"dictData.sort",
					"dictData.status",
					"dictData.remark",
					"dictData.createdAt",
					"dictData.updatedAt",
				],
				limit: query.pageSize,
				offset: (query.page - 1) * query.pageSize,
				orderBy: { dictData: { sort: "asc", id: "asc" } },
			},
		);
		return {
			items: relations.map((relation) => this.toDataResult(relation.dictData, type.dictType)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	async findData(id: number): Promise<DictDataResult> {
		const relation = await this.findDataRelation(this.em, id);
		return this.toDataResult(relation.dictData, relation.dictType.dictType);
	}

	async updateData(id: number, dto: UpdateDictDataDto): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const relation = await this.findDataRelation(em, id);
			const data = relation.dictData;
			if (dto.value !== undefined && dto.value !== data.value) {
				await em.lock(relation.dictType, LockMode.PESSIMISTIC_WRITE);
				await this.assertDataValueAvailable(em, relation.dictType, dto.value, data.id);
				data.value = dto.value;
			}
			if (dto.label !== undefined) data.label = dto.label;
			if (dto.sort !== undefined) data.sort = dto.sort;
			if (dto.status !== undefined) data.status = dto.status;
			if (dto.remark !== undefined) data.remark = dto.remark;
			await em.flush();
			return this.toDataResult(data, relation.dictType.dictType);
		});
	}

	async removeData(id: number): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const relation = await this.findDataRelation(em, id);
			const now = new Date();
			relation.deletedAt = now;
			relation.updatedAt = now;
			relation.dictData.deletedAt = now;
			relation.dictData.updatedAt = now;
			await em.flush();
			return this.toDataResult(relation.dictData, relation.dictType.dictType);
		});
	}

	private async findTypeEntity(em: EntityManager, id: number): Promise<DictTypeEntity> {
		const entity = await em.findOne(
			DictTypeEntity,
			{ id, deletedAt: null },
			{ fields: ["id", "dictName", "dictType", "status", "remark", "createdAt", "updatedAt", "deletedAt"] },
		);
		if (!entity) throw new NotFoundException("字典类型不存在");
		return entity;
	}

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

	private async findDataRelation(em: EntityManager, dataId: number): Promise<DictTypeDataEntity> {
		const relation = await em.findOne(
			DictTypeDataEntity,
			{
				dictType: { deletedAt: null },
				dictData: { id: dataId, deletedAt: null },
				deletedAt: null,
			},
			{
				populate: ["dictType", "dictData"],
				strategy: LoadStrategy.JOINED,
				fields: [
					"id",
					"dictType.id",
					"dictType.dictType",
					"dictData.id",
					"dictData.label",
					"dictData.value",
					"dictData.sort",
					"dictData.status",
					"dictData.remark",
					"dictData.createdAt",
					"dictData.updatedAt",
				],
			},
		);
		if (!relation) throw new NotFoundException("字典数据不存在");
		return relation as DictTypeDataEntity;
	}

	/**
	 * 类型 ID 与 value 分处两张表，普通唯一索引无法跨表约束，因此在写入边界集中校验。
	 */
	private async assertDataValueAvailable(
		em: EntityManager,
		type: DictTypeEntity,
		value: string,
		excludedDataId?: number,
	): Promise<void> {
		const dataWhere: FilterQuery<DictDataEntity> = { value, deletedAt: null };
		if (excludedDataId !== undefined) dataWhere.id = { $ne: excludedDataId };
		const existing = await em.findOne(
			DictTypeDataEntity,
			{
				dictType: type,
				dictData: dataWhere,
				deletedAt: null,
			},
			{ fields: ["id"] },
		);
		if (existing) throw new ConflictException("同一字典类型下的字典值已存在");
	}

	private toTypeResult(entity: DictTypeView): DictTypeResult {
		return {
			id: entity.id,
			dictName: entity.dictName,
			dictType: entity.dictType,
			status: entity.status,
			remark: entity.remark,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	private toDataResult(entity: DictDataView, dictType: string): DictDataResult {
		return {
			id: entity.id,
			dictType,
			label: entity.label,
			value: entity.value,
			sort: entity.sort,
			status: entity.status,
			remark: entity.remark,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
