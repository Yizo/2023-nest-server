import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { PositiveIntPipe } from "@/common/pipes";
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from "./dto";
import { RoleService } from "./role.service";

@ApiTags("角色管理")
@Controller("roles")
export class RoleController {
	constructor(private readonly service: RoleService) {}

	@Post()
	@ApiOperation({ summary: "新增角色", description: "角色编码创建后不可修改。" })
	@ApiBody({ type: CreateRoleDto })
	createRole(@Body() dto: CreateRoleDto) {
		return this.service.createRole(dto);
	}

	@Get()
	@ApiOperation({ summary: "分页查询角色" })
	findRoles(@Query() query: QueryRoleDto) {
		return this.service.findRoles(query);
	}

	@Get(":id")
	@ApiOperation({ summary: "角色详情" })
	@ApiParam({ name: "id", description: "角色 ID", example: 1 })
	findRole(@Param("id", PositiveIntPipe) id: number) {
		return this.service.findRole(id);
	}

	@Post(":id/update")
	@ApiOperation({ summary: "修改角色", description: "不能修改角色编码。" })
	@ApiParam({ name: "id", description: "角色 ID", example: 1 })
	@ApiBody({ type: UpdateRoleDto })
	updateRole(@Param("id", PositiveIntPipe) id: number, @Body() dto: UpdateRoleDto) {
		return this.service.updateRole(id, dto);
	}

	@Post(":id/remove")
	@ApiOperation({ summary: "软删除角色", description: "软删除指定角色，不可恢复。" })
	@ApiParam({ name: "id", description: "角色 ID", example: 1 })
	removeRole(@Param("id", PositiveIntPipe) id: number) {
		return this.service.removeRole(id);
	}
}
