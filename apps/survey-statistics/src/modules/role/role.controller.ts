import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleService } from "./role.service";

@Controller("roles")
@ApiTags("roles")
@ApiBearerAuth()
export class RoleController {
	constructor(private readonly roleService: RoleService) {}

	@Get()
	async findAll() {
		return this.roleService.findAll();
	}
}
