import { Controller, Get, Query, Post, Body, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleService } from "./role.service";
import { PagePipe } from "@/common/pipes/page.pipe";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Controller("roles")
@ApiTags("roles")
@ApiBearerAuth()
export class RoleController {
	constructor(private readonly roleService: RoleService) {}

	@Get("/list")
	async findAll(@Query(new PagePipe()) pageInfo: { page: number; pageSize: number }) {
		const { data, total } = await this.roleService.findAll(pageInfo.page, pageInfo.pageSize);
		return {
			data,
			total,
			page: pageInfo.page,
			pageSize: pageInfo.pageSize,
		};
	}

	@Post("/create")
	async create(@Body() createRoleDto: CreateRoleDto) {
		return this.roleService.create(createRoleDto);
	}

	@Post("/update")
	async update(@Body() updateRoleDto: UpdateRoleDto) {
		return this.roleService.update(updateRoleDto);
    }

    @Post("/remove/:id")
    async remove(@Param("id") id: number) {
        return this.roleService.remove(id);
    }
}
