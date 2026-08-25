import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { PositiveIntPipe } from "@/common/pipes";
import {
	CreateDictDataDto,
	CreateDictTypeDto,
	QueryDictDataDto,
	QueryDictTypeDto,
	UpdateDictDataDto,
	UpdateDictTypeDto,
} from "./dto";
import { DictService } from "./dict.service";

@ApiTags("字典管理")
@Controller("dict")
export class DictController {
	constructor(private readonly service: DictService) {}

	@Post("types")
	@ApiOperation({ summary: "新增字典类型", description: "字典类型编码创建后不可修改。" })
	@ApiBody({ type: CreateDictTypeDto })
	createType(@Body() dto: CreateDictTypeDto) {
		return this.service.createType(dto);
	}

	@Get("types")
	@ApiOperation({ summary: "分页查询字典类型" })
	findTypes(@Query() query: QueryDictTypeDto) {
		return this.service.findTypes(query);
	}

	@Get("types/:id")
	@ApiOperation({ summary: "字典类型详情" })
	@ApiParam({ name: "id", description: "字典类型 ID", example: 1 })
	findType(@Param("id", PositiveIntPipe) id: number) {
		return this.service.findType(id);
	}

	@Post("types/:id/update")
	@ApiOperation({ summary: "修改字典类型", description: "不能修改字典类型编码。" })
	@ApiParam({ name: "id", description: "字典类型 ID", example: 1 })
	@ApiBody({ type: UpdateDictTypeDto })
	updateType(@Param("id", PositiveIntPipe) id: number, @Body() dto: UpdateDictTypeDto) {
		return this.service.updateType(id, dto);
	}

	@Post("types/:id/remove")
	@ApiOperation({
		summary: "软删除字典类型",
		description: "同时软删除该类型下的字典数据和关联记录，不可恢复。",
	})
	@ApiParam({ name: "id", description: "字典类型 ID", example: 1 })
	removeType(@Param("id", PositiveIntPipe) id: number) {
		return this.service.removeType(id);
	}

	@Post("data")
	@ApiOperation({ summary: "新增字典数据" })
	@ApiBody({ type: CreateDictDataDto })
	createData(@Body() dto: CreateDictDataDto) {
		return this.service.createData(dto);
	}

	@Get("data")
	@ApiOperation({ summary: "分页查询字典数据", description: "必须传入所属字典类型编码。" })
	findDataList(@Query() query: QueryDictDataDto) {
		return this.service.findDataList(query);
	}

	@Get("data/:id")
	@ApiOperation({ summary: "字典数据详情" })
	@ApiParam({ name: "id", description: "字典数据 ID", example: 1 })
	findData(@Param("id", PositiveIntPipe) id: number) {
		return this.service.findData(id);
	}

	@Post("data/:id/update")
	@ApiOperation({ summary: "修改字典数据", description: "不能把数据改到另一个字典类型下。" })
	@ApiParam({ name: "id", description: "字典数据 ID", example: 1 })
	@ApiBody({ type: UpdateDictDataDto })
	updateData(@Param("id", PositiveIntPipe) id: number, @Body() dto: UpdateDictDataDto) {
		return this.service.updateData(id, dto);
	}

	@Post("data/:id/remove")
	@ApiOperation({ summary: "软删除字典数据", description: "同时软删除类型与数据的关联，不可恢复。" })
	@ApiParam({ name: "id", description: "字典数据 ID", example: 1 })
	removeData(@Param("id", PositiveIntPipe) id: number) {
		return this.service.removeData(id);
	}
}
