import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { PositiveIntPipe } from "@/common/pipes";
import { CreateMenuDto, QueryMenuDto, UpdateMenuDto } from "./dto";
import { MenuService } from "./menu.service";

@ApiTags("菜单管理")
@Controller("menus")
export class MenuController {
	constructor(private readonly service: MenuService) {}

	@Post()
	@ApiOperation({ summary: "新增菜单", description: "目录、菜单和操作类型使用不同的字段规则。" })
	@ApiBody({ type: CreateMenuDto })
	createMenu(@Body() dto: CreateMenuDto) {
		return this.service.createMenu(dto);
	}

	@Get()
	@ApiOperation({ summary: "查询菜单", description: "默认返回全部有效菜单，传分页参数后按页查询。" })
	findMenus(@Query() query: QueryMenuDto) {
		return this.service.findMenus(query);
	}

	@Get(":id")
	@ApiOperation({ summary: "菜单详情" })
	@ApiParam({ name: "id", description: "菜单 ID", example: 1 })
	findMenu(@Param("id", PositiveIntPipe) id: number) {
		return this.service.findMenu(id);
	}

	@Post(":id/update")
	@ApiOperation({ summary: "修改菜单", description: "菜单类型创建后不可修改，移动菜单时不能形成循环。" })
	@ApiParam({ name: "id", description: "菜单 ID", example: 1 })
	@ApiBody({ type: UpdateMenuDto })
	updateMenu(@Param("id", PositiveIntPipe) id: number, @Body() dto: UpdateMenuDto) {
		return this.service.updateMenu(id, dto);
	}

	@Post(":id/remove")
	@ApiOperation({ summary: "软删除菜单", description: "删除菜单时会清理该菜单的角色关联，存在有效子菜单时不能删除。" })
	@ApiParam({ name: "id", description: "菜单 ID", example: 1 })
	removeMenu(@Param("id", PositiveIntPipe) id: number) {
		return this.service.removeMenu(id);
	}
}
