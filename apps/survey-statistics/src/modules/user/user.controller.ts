import { Controller, Get, Query, Param, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { formatPage } from "@base/utils";

@Controller("users")
@ApiTags("users")
@ApiBearerAuth()
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Get("/list")
	@ApiOperation({ summary: "分页查询用户" })
	@ApiQuery({ name: "page", required: false })
	@ApiQuery({ name: "pageSize", required: false })
	async list(@Query("page") page = "1", @Query("pageSize") pageSize = "10") {
		const { page: pageNum, pageSize: pageSizeNum } = formatPage(page, pageSize);
		const { data, total } = await this.userService.list(pageNum, pageSizeNum);
		return {
			data,
			total,
			page: pageNum,
			pageSize: pageSizeNum,
		};
	}

	@Get(":id")
	@ApiOperation({ summary: "查询单个用户" })
	async detail(@Param("id") id: string) {
		return await this.userService.findById(id);
	}

	@Post("/create")
	@ApiOperation({ summary: "创建用户" })
	create(@Body() dto: CreateUserDto) {
		return this.userService.create(dto);
	}

	@Post(":id")
	@ApiOperation({ summary: "修改用户信息" })
	update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
		return this.userService.update(id, dto);
	}

	@Post(":id")
	@ApiOperation({ summary: "删除用户" })
	remove(@Param("id") id: string) {
		return this.userService.remove(id);
	}
}
