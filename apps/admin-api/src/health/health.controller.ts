import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators";
import { HealthService } from "./health.service";

/** 提供给 1Panel、反向代理和人工排障使用的存活/就绪接口。 */
@ApiTags("健康检查")
@Controller("health")
export class HealthController {
	constructor(private readonly service: HealthService) {}

	@Get("live")
	@Public()
	@ApiOperation({ summary: "进程存活检查" })
	live() {
		return this.service.live();
	}

	@Get("ready")
	@Public()
	@ApiOperation({ summary: "数据库和 Redis 就绪检查" })
	ready() {
		return this.service.ready();
	}
}
