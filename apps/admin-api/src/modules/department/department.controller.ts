import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { PositiveIntPipe } from "@/common/pipes";
import { CreateDepartmentDto, QueryDepartmentDto, UpdateDepartmentDto } from "./dto";
import { DepartmentService } from "./department.service";

@ApiTags("部门管理")
@Controller("departments")
export class DepartmentController {
	constructor(private readonly service: DepartmentService) {}

	@Post()
	@ApiOperation({ summary: "新增部门", description: "父部门为空时创建根部门。" })
	@ApiBody({ type: CreateDepartmentDto })
	createDepartment(@Body() dto: CreateDepartmentDto) {
		return this.service.createDepartment(dto);
	}

	@Get()
	@ApiOperation({ summary: "分页查询部门" })
	findDepartments(@Query() query: QueryDepartmentDto) {
		return this.service.findDepartments(query);
	}

	@Get(":id")
	@ApiOperation({ summary: "部门详情" })
	@ApiParam({ name: "id", description: "部门 ID", example: 1 })
	findDepartment(@Param("id", PositiveIntPipe) id: number) {
		return this.service.findDepartment(id);
	}

	@Post(":id/update")
	@ApiOperation({ summary: "修改部门", description: "移动部门时会同步更新后代祖级列表。" })
	@ApiParam({ name: "id", description: "部门 ID", example: 1 })
	@ApiBody({ type: UpdateDepartmentDto })
	updateDepartment(@Param("id", PositiveIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
		return this.service.updateDepartment(id, dto);
	}

	@Post(":id/remove")
	@ApiOperation({ summary: "软删除部门", description: "存在有效子部门时不能删除。" })
	@ApiParam({ name: "id", description: "部门 ID", example: 1 })
	removeDepartment(@Param("id", PositiveIntPipe) id: number) {
		return this.service.removeDepartment(id);
	}
}
