import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { DictType } from "./entities/dictType.entity";
import { DictData } from "./entities/dictData.entity";
import { CreateDictTypeDto, UpdateDictTypeDto, GetDictTypeDto } from "./dto/dictType";
import {
	CreateDictDataDto,
	UpdateDictDataDto,
	GetDictDataDto,
	DeleteDictDataDto,
} from "./dto/dictData";
import { paginateBuilder } from "@base/commons";

@Injectable()
export class DictionaryService {
	constructor(
		@InjectRepository(DictType)
		private readonly dictTypeRepository: Repository<DictType>,
		@InjectRepository(DictData)
		private readonly dictDataRepository: Repository<DictData>,
	) {}

	/**
	 * 获取全部启用状态的字典类型和字典数据
	 * **/
	async getAll() {
		return this.dictTypeRepository
			.createQueryBuilder("dt")
			.leftJoinAndSelect("dt.data", "data", "data.status = :status", { status: 1 })
			.where("dt.status = :status", { status: 1 })
			.orderBy("dt.id", "ASC")
			.addOrderBy("data.sortOrder", "ASC")
			.getMany();
	}
	/**
	 * 分页查询字典类型列表
	 */
	async getTypeList(query: GetDictTypeDto) {
		const { page, pageSize, name, status, sort } = query;
		const queryBuilder = this.dictTypeRepository
			.createQueryBuilder("dt")
			.leftJoin("dt.data", "dd")
			.select([
				"dt.id",
				"dt.name",
				"dt.status",
				"dt.description",
				"dt.createdAt",
				"dt.updatedAt",
			])
			.addSelect("COUNT(dd.id)", "count")
			.groupBy("dt.id"); // 按主表分组

		if (name) {
			queryBuilder.andWhere("dt.name LIKE :name", { name: `%${name}%` });
		}
		if (status != null) {
			queryBuilder.andWhere("dt.status = :status", { status });
		}

		// 排序
		const orderDirection = sort?.toUpperCase() === "DESC" ? "DESC" : "ASC";
		queryBuilder.orderBy("dt.updatedAt", orderDirection);

		return await paginateBuilder(queryBuilder, { page, pageSize });
	}
	async createType(createTypeDto: CreateDictTypeDto) {
		return await this.dictTypeRepository.insert(createTypeDto);
	}
	async updateType(updateTypeDto: UpdateDictTypeDto) {
		const { id } = updateTypeDto;
		await this.dictTypeRepository
			.createQueryBuilder("dictType")
			.update()
			.set(updateTypeDto)
			.where("id = :id", { id })
			.execute();
	}
	async deleteType(id: number) {
		// 判断类型下是否存在数据
		const dictData = await this.dictDataRepository.findOne({
			where: { type: { id } },
		});
		if (dictData) {
			throw new BadRequestException("类型下存在数据，不能删除");
		}
		return await this.dictTypeRepository
			.createQueryBuilder("dictType")
			.delete()
			.where("id = :id", { id })
			.execute();
	}

	// 查询字典类型
	async findTypeById(id: number) {
		return await this.dictTypeRepository.findOne({
			where: { id },
		});
	}

	/**分页查询字典数据*/
	async getDataList(query: GetDictDataDto) {
		const { page, pageSize, name, value, status, sort, typeId } = query;
		const queryBuilder = this.dictDataRepository
			.createQueryBuilder("dd")
			.where("dd.typeId = :typeId", { typeId });
		if (name) {
			queryBuilder.andWhere("dd.name LIKE :name", { name: `%${name}%` });
		}
		if (value) {
			queryBuilder.andWhere("dd.value LIKE :value", { value: `%${value}%` });
		}
		if (status != null) {
			queryBuilder.andWhere("dd.status = :status", { status });
		}
		if (sort) {
			const orderDirection = sort?.toUpperCase() === "DESC" ? "DESC" : "ASC";
			queryBuilder.orderBy("dd.updatedAt", orderDirection);
		} else {
			queryBuilder.orderBy("dd.sortOrder", "ASC");
		}
		return await paginateBuilder(queryBuilder, { page, pageSize });
	}
	async createData(createDataDto: CreateDictDataDto) {
		const dictType = await this.findTypeById(createDataDto.typeId);
		if (!dictType) {
			throw new BadRequestException("字典类型不存在");
		}
		await this.dictDataRepository
			.createQueryBuilder()
			.insert()
			.values({
				...createDataDto,
				type: dictType,
			})
			.execute();
		return null;
	}
	async updateData(updateDataDto: UpdateDictDataDto) {
		const { id, typeId, ...rest } = updateDataDto;
		const dictType = await this.findTypeById(typeId);
		if (!dictType) {
			throw new BadRequestException("字典类型不存在");
		}
		await this.dictDataRepository
			.createQueryBuilder("dictData")
			.update()
			.set(rest)
			.where("id = :id", { id })
			.execute();
		return null;
	}
	async deleteData(deleteDataDto: DeleteDictDataDto) {
		const { id, typeId } = deleteDataDto;
		const dictType = await this.findTypeById(typeId);
		if (!dictType) {
			throw new BadRequestException("字典类型不存在");
		}
		await this.dictDataRepository
			.createQueryBuilder("dictData")
			.delete()
			.where("id = :id", { id })
			.execute();
		return null;
	}
}
