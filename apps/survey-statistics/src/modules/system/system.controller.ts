import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { SystemService } from "./system.service";
import { CreateSystemDto } from "./dto/create-system.dto";
import { UpdateSystemDto } from "./dto/update-system.dto";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";

@Controller("system")
export class SystemController {
	constructor(private readonly systemService: SystemService) {}

	// 查询是否已初始化
	@Get("/is-initialized")
	@ApiOperation({ summary: "查询是否已初始化" })
	@ApiResponse({ status: 200, description: "返回是否已初始化" })
	isInitialized() {
		return this.systemService.isInitialized();
	}

	// 系统初始化
	@Post("/init")
	@ApiOperation({ summary: "系统初始化" })
	@ApiResponse({ status: 200, description: "系统初始化成功" })
	create(@Body() createSystemDto: CreateSystemDto) {
		return this.systemService.create(createSystemDto);
	}

	// 系统配置更新
	@Post(":id")
	update(@Param("id") id: string, @Body() updateSystemDto: UpdateSystemDto) {
		return this.systemService.update(+id, updateSystemDto);
	}
}
