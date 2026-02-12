import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, QueryBuilder } from "typeorm";
import { DictType } from "./entities/dictType.entity";
import { DictData } from "./entities/dictData.entity";
import { QueryBuilderFactory, QueryBuilderHelper } from "@base/commons";
import { CreateDictTypeDto, UpdateDictTypeDto, GetDictTypeDto } from "./dto/dictType";
import { CreateDictDataDto, UpdateDictDataDto, GetDictDataDto } from "./dto/dictData";

@Injectable()
export class DictionaryService {
	private dictTypeQueryBuilder: QueryBuilderHelper<DictType>;
	private dictDataQueryBuilder: QueryBuilderHelper<DictData>;
	private dictTypeBuilder: QueryBuilder<DictType>;
	private dictDataBuilder: QueryBuilder<DictData>;
	constructor(
		@InjectRepository(DictType)
		private readonly dictTypeRepository: Repository<DictType>,
		@InjectRepository(DictData)
		private readonly dictDataRepository: Repository<DictData>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
	) {
		this.dictTypeQueryBuilder = this.queryBuilderFactory.createFromRepository(
			this.dictTypeRepository,
		);
		this.dictDataQueryBuilder = this.queryBuilderFactory.createFromRepository(
			this.dictDataRepository,
		);
		this.dictTypeBuilder = this.dictTypeRepository.createQueryBuilder("dictType");
		this.dictDataBuilder = this.dictDataRepository.createQueryBuilder("dictData");
	}
	/**
	 * 字典类型
	 */
	async findAllTypes(query: GetDictTypeDto) {
		const { page, pageSize, name, status, sort } = query;

		const conditions = [];
		const orderBy = [];
		if (name) {
			conditions.push({ field: "dictType.name", operator: "like", value: `%${name}%` });
		}
		if (status) {
			conditions.push({ field: "dictType.status", operator: "eq", value: status });
		}
		if (sort) {
			orderBy.push({ field: "dictType.updatedAt", direction: sort.toUpperCase() });
		}

		return await this.dictTypeQueryBuilder.findPaginated(
			{
				alias: "dictType",
				conditions,
				orderBy,
			},
			page,
			pageSize,
		);
	}
	async createType(createTypeDto: CreateDictTypeDto) {
		return await this.dictTypeBuilder.insert().values(createTypeDto).execute();
	}
	async updateType(updateTypeDto: UpdateDictTypeDto) {
		const { id } = updateTypeDto;
		await this.dictTypeBuilder.update().set(updateTypeDto).where("id = :id", { id }).execute();
	}
	async deleteType(id: number) {
		return await this.dictTypeBuilder.delete().where("id = :id", { id }).execute();
	}

	/**字典数据*/
	async findAllData(query: GetDictDataDto) {
		const { page, pageSize, name, value, status, sort } = query;
		return await this.dictDataQueryBuilder.findPaginated(
			{
				alias: "dictData",
				joins: [{ property: "dictData.dictType", alias: "dictType", type: "leftJoin" }],
				conditions: [
					{ field: "dictData.name", operator: "like", value: `%${name}%` },
					{ field: "dictData.value", operator: "like", value: `%${value}%` },
					{ field: "dictData.status", operator: "eq", value: status },
					{ field: "dictData.sort", operator: "eq", value: sort },
				],
				orderBy: [{ field: "dictData.sort", direction: "ASC" }],
			},
			page,
			pageSize,
		);
	}
	async createData(createDataDto: CreateDictDataDto) {
		return await this.dictDataRepository.create(createDataDto);
	}
	async updateData(id: number, updateDataDto: UpdateDictDataDto) {
		return await this.dictDataRepository.update(id, updateDataDto);
	}
	async deleteData(id: number) {
		return await this.dictDataRepository.delete(id);
	}
}
