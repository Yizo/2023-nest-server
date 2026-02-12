import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { DictionaryService } from "./dictionary.service";
import { PagePipe } from "@/common/pipes/page.pipe";
import { CreateDictTypeDto, UpdateDictTypeDto, GetDictTypeDto } from "./dto/dictType";
import {
	CreateDictDataDto,
	UpdateDictDataDto,
	GetDictDataDto,
	DeleteDictDataDto,
} from "./dto/dictData";

@Controller("dictionary")
export class DictionaryController {
	constructor(private readonly dictionaryService: DictionaryService) {}

	/**
	 * 字典类型列表
	 * 1. 分页查询
	 * 2. 筛选条件: 名称, 状态
	 * 3. 排序: 更新时间
	 */
	@Get("/types/list")
	async findAllTypes(@Query(new PagePipe()) query: GetDictTypeDto) {
		const { data, total } = await this.dictionaryService.findAllTypes(query);
		return {
			data,
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}
	@Post("/types/create")
	async createType(@Body() createTypeDto: CreateDictTypeDto) {
		return await this.dictionaryService.createType(createTypeDto);
	}
	@Post("/types/update")
	async updateType(@Body() updateTypeDto: UpdateDictTypeDto) {
		return this.dictionaryService.updateType(updateTypeDto);
	}
	@Post("/types/delete/:id")
	async deleteType(@Param("id") id: number) {
		return this.dictionaryService.deleteType(id);
	}

	/**
	 * 字典数据列表
	 * 1. 分页查询
	 * 2. 筛选条件: 名称, 值, 状态
	 * 3. 排序: 更新时间
	 */
	@Get("/data/list")
	async findAllData(@Query(new PagePipe()) query: GetDictDataDto) {
		return this.dictionaryService.findAllData(query);
	}
	@Post("/data/create")
	async createData(@Body() createDataDto: CreateDictDataDto) {
		return this.dictionaryService.createData(createDataDto);
	}
	@Post("/data/update")
	async updateData(@Body() updateDataDto: UpdateDictDataDto) {
		return this.dictionaryService.updateData(updateDataDto);
	}
	@Post("/data/delete")
	async deleteData(@Body() deleteDataDto: DeleteDictDataDto) {
		return this.dictionaryService.deleteData(deleteDataDto);
	}
}
