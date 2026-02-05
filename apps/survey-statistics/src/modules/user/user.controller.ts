import { Controller, Get, Query, Param, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PagePipe } from "@/common/pipes/page.pipe";

@Controller("users")
@ApiTags("users")
@ApiBearerAuth()
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Get("/list")
	@ApiOperation({ summary: "分页查询用户" })
	@ApiQuery({ name: "page", required: false })
	@ApiQuery({ name: "pageSize", required: false })
	async list(@Query(new PagePipe()) pageInfo: { page: number; pageSize: number }) {
		const { data, total } = await this.userService.list(pageInfo.page, pageInfo.pageSize);
		return {
			data,
			total,
			page: pageInfo.page,
			pageSize: pageInfo.pageSize,
		};
	}

	@Get("/detail/:id")
	@ApiOperation({ summary: "查询单个用户" })
	async detail(@Param("id") id: string) {
		return await this.userService.findById(id);
    }

    // 查询用户详情
    @Get("/find-user-detail/:id")
    async findUserDetail(@Param("id") id: string) {
        return await this.userService.findUserDetail(id);
    }

	@Post("/create")
	@ApiOperation({ summary: "创建用户" })
	create(@Body() dto: CreateUserDto) {
		return this.userService.create(dto);
	}

	@Post("/update")
	@ApiOperation({ summary: "修改用户信息" })
	update(@Body() dto: UpdateUserDto) {
		return this.userService.update(dto);
	}

	@Post("/remove/:id")
	@ApiOperation({ summary: "删除用户" })
	remove(@Param("id") id: string) {
		return this.userService.remove(id);
	}
}
