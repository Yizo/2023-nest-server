import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators";
import { InitializeSystemDto } from "./dto";
import { SystemInitializationService } from "./system-initialization.service";

@ApiTags("系统初始化")
@Controller("system")
export class SystemInitializationController {
	constructor(private readonly service: SystemInitializationService) {}

	@Post("initialize")
	@Public()
	@ApiOperation({ summary: "执行系统初始化", description: "使用初始化密钥幂等创建系统角色和超级管理员。" })
	@ApiHeader({ name: "x-initialization-key", description: "系统初始化密钥", required: true })
	@ApiBody({ type: InitializeSystemDto })
	initialize(
		@Headers("x-initialization-key") initializationKey: string | undefined,
		@Body() dto: InitializeSystemDto,
	) {
		return this.service.initialize(initializationKey, dto);
	}
}
