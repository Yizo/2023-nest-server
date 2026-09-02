import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AuthRequired, RequirePermissions } from "@/common/decorators";
import { PositiveIntPipe } from "@/common/pipes";
import { CreateUserDto, QueryUserDto, UpdateUserDto } from "./dto";
import { UserService } from "./user.service";

@ApiTags("用户管理")
@Controller("users")
@AuthRequired()
export class UserController {
	constructor(private readonly service: UserService) {}

	@Post()
	@RequirePermissions("user:create")
	@ApiOperation({ summary: "新增用户", description: "用户账号创建后不可修改，密码不会在接口中返回。" })
	@ApiBody({ type: CreateUserDto })
	createUser(@Body() dto: CreateUserDto) {
		return this.service.createUser(dto);
	}

	@Get()
	@RequirePermissions("user:list")
	@ApiOperation({ summary: "分页查询用户" })
	findUsers(@Query() query: QueryUserDto) {
		return this.service.findUsers(query);
	}

	@Get(":id")
	@RequirePermissions("user:detail")
	@ApiOperation({ summary: "用户详情" })
	@ApiParam({ name: "id", description: "用户 ID", example: 1 })
	findUser(@Param("id", PositiveIntPipe) id: number) {
		return this.service.findUser(id);
	}

	@Post(":id/update")
	@RequirePermissions("user:update")
	@ApiOperation({ summary: "修改用户", description: "不能修改用户账号；传入密码时会重新生成密码哈希。" })
	@ApiParam({ name: "id", description: "用户 ID", example: 1 })
	@ApiBody({ type: UpdateUserDto })
	updateUser(
		@Param("id", PositiveIntPipe) id: number,
		@Body() dto: UpdateUserDto,
	) {
		return this.service.updateUser(id, dto);
	}

	@Post(":id/remove")
	@RequirePermissions("user:remove")
	@ApiOperation({ summary: "软删除用户", description: "同时解除用户当前拥有的角色。" })
	@ApiParam({ name: "id", description: "用户 ID", example: 1 })
	removeUser(@Param("id", PositiveIntPipe) id: number) {
		return this.service.removeUser(id);
	}
}
