import {
	Controller,
	Get,
	Query,
	Param,
	Post,
	Body,
	Put,
	Delete,
	HttpCode,
	NotFoundException,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiNoContentResponse,
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
@ApiTags("users")
@ApiBearerAuth()
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post()
	@ApiOperation({ summary: "创建用户" })
	@ApiCreatedResponse({ description: "用户创建成功" })
	create(@Body() dto: CreateUserDto) {
		return this.userService.create(dto);
	}

	@Get()
	@ApiOperation({ summary: "分页查询用户" })
	@ApiQuery({ name: "page", required: false })
	@ApiQuery({ name: "pageSize", required: false })
	@ApiOkResponse({ description: "返回分页结果列表" })
	async list(@Query("page") page = "1", @Query("pageSize") pageSize = "10") {
		const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
		const pageSizeNum = Math.max(1, Number.parseInt(pageSize, 10) || 10);
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
	@ApiOkResponse({ description: "返回用户详情" })
	async detail(@Param("id") id: string) {
		const user = await this.userService.findById(id);
		if (!user) {
			throw new NotFoundException("用户不存在");
		}
		const { password, ...rest } = user;
		return rest;
	}

	@Put(":id")
	@ApiOperation({ summary: "修改用户信息" })
	@ApiOkResponse({ description: "用户更新完成" })
	update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
		return this.userService.update(id, dto);
	}

	@Delete(":id")
	@HttpCode(204)
	@ApiOperation({ summary: "删除用户" })
	@ApiNoContentResponse({ description: "用户已删除" })
	remove(@Param("id") id: string) {
		return this.userService.remove(id);
	}
}
