import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "./common/decorators";
import { ConfigService } from "@nestjs/config";
import type { AdminApiConfig } from "./config";

/** 最小根接口，用于确认 Nest 应用本身已经启动。 */
@ApiTags("应用")
@Controller()
export class AppController {
	constructor(private readonly configService: ConfigService) {}

	@Get()
	@Public()
	@ApiOperation({ summary: "应用基础信息" })
	info() {
		const config = this.configService.getOrThrow<AdminApiConfig>("app");
		return {
			name: config.app.name,
			environment: config.app.nodeEnv,
			message: "admin-api is running",
		};
	}
}
