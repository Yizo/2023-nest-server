import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { type FilterQuery, LoadStrategy, LockMode, UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import {
	CreateDictDataDto,
	CreateDictTypeDto,
	QueryDictDataDto,
	QueryDictTypeDto,
	UpdateDictDataDto,
	UpdateDictTypeDto,
} from "./dto";
import { DictDataEntity, DictTypeEntity } from "./entities";

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

	async createData(dto: CreateDictDataDto): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const type = await this.findTypeByCode(em, dto.dictType, true);
			await this.assertDataValueAvailable(em, type, dto.value);
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

	async findDataList(query: QueryDictDataDto): Promise<DictPageResult<DictDataResult>> {
		const type = await this.findTypeByCode(this.em, query.dictType);
		const where: FilterQuery<DictDataEntity> = { dictType: type, deletedAt: null };
		if (query.label) where.label = { $ilike: `%${query.label}%` };
		if (query.value) where.value = { $ilike: `%${query.value}%` };
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(DictDataEntity, where, {
			fields: ["id", "label", "value", "sort", "status", "remark", "createdAt", "updatedAt"],
			limit: query.pageSize,
			offset: (query.page - 1) * query.pageSize,
			orderBy: { sort: "asc", id: "asc" },
		});
		return {
			items: entities.map((entity) => this.toDataResult(entity, type.dictType)),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	async findData(id: number): Promise<DictDataResult> {
		const data = await this.findDataEntity(this.em, id);
		return this.toDataResult(data, data.dictType.dictType);
	}

	async updateData(id: number, dto: UpdateDictDataDto): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const data = await this.findDataEntity(em, id);
			if (dto.value !== undefined && dto.value !== data.value) {
				await em.lock(data.dictType, LockMode.PESSIMISTIC_WRITE);
				await this.assertDataValueAvailable(em, data.dictType, dto.value, data.id);
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

	async removeData(id: number): Promise<DictDataResult> {
		return this.em.transactional(async (em) => {
			const data = await this.findDataEntity(em, id);
			const now = new Date();
			data.deletedAt = now;
			data.updatedAt = now;
			await em.flush();
			return this.toDataResult(data, data.dictType.dictType);
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

	private async assertDataValueAvailable(
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
