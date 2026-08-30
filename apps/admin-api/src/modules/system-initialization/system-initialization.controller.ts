import { Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SystemInitializationService } from "./system-initialization.service";

@ApiTags("系统初始化")
@Controller("system")
export class SystemInitializationController {
	constructor(private readonly service: SystemInitializationService) {}

	@Post("initialize")
	@ApiOperation({ summary: "执行系统初始化", description: "幂等确保系统角色存在。" })
	initialize() {
		return this.service.initialize();
	}
}
