import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@/common/decorators";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import { IdentityQueries } from "./identity.queries";
import { AssignPermissionsDto, AssignRolesDto, CreateRoleDto, CreateUserDto, RoleListQueryDto, UpdateRoleDto, UpdateUserDto, UserListQueryDto } from "./identity.dto";
import { IdentityService } from "./identity.service";
import { AuthorizationService } from "./authorization.service";

/** 身份管理 HTTP 边界；具体事务和数据校验位于 IdentityService。 */
@ApiTags("身份与权限")
@ApiBearerAuth("bearer")
@Controller("identity")
export class IdentityController {
  constructor(
    private readonly service: IdentityService,
    private readonly queries: IdentityQueries,
    private readonly authorization: AuthorizationService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "当前登录用户", description: "返回当前用户资料及其权限编码列表。" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { ...user, permissions: await this.authorization.listPermissionCodes(user.id) };
  }

  @Get("users")
  @RequirePermissions("user.read")
  @ApiOperation({ summary: "用户列表" })
  listUsers(@Query() query: UserListQueryDto) {
    return this.queries.listUsers(query);
  }

  @Post("users")
  @RequirePermissions("user.create")
  @ApiOperation({ summary: "创建用户" })
  createUser(@Body() body: CreateUserDto) {
    return this.service.createUser(body);
  }

  @Post("users/:id/update")
  @RequirePermissions("user.update")
  @ApiParam({ name: "id", description: "用户 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新用户", description: "可修改显示名称和状态；用户名与邮箱不可改。" })
  updateUser(@Param("id") id: string, @Body() body: UpdateUserDto) {
    return this.service.updateUser(id, body);
  }

  @Post("users/:id/roles")
  @RequirePermissions("user.assign-role")
  @ApiParam({ name: "id", description: "用户 ID（UUIDv7）" })
  @ApiOperation({ summary: "分配用户角色", description: "用传入的角色列表覆盖该用户当前角色。" })
  assignRoles(@Param("id") id: string, @Body() body: AssignRolesDto) {
    return this.service.assignRoles(id, body.roleIds);
  }

  @Get("roles")
  @RequirePermissions("role.read")
  @ApiOperation({ summary: "角色列表" })
  listRoles(@Query() query: RoleListQueryDto) {
    return this.queries.listRoles(query);
  }

  @Post("roles")
  @RequirePermissions("role.create")
  @ApiOperation({ summary: "创建角色", description: "角色编码创建后不可修改。" })
  createRole(@Body() body: CreateRoleDto) {
    return this.service.createRole(body);
  }

  @Post("roles/:id/update")
  @RequirePermissions("role.update")
  @ApiParam({ name: "id", description: "角色 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新角色", description: "不支持物理删除；停用请把 enabled 设为 false。" })
  updateRole(@Param("id") id: string, @Body() body: UpdateRoleDto) {
    return this.service.updateRole(id, body);
  }

  @Post("roles/:id/permissions")
  @RequirePermissions("role.assign-permission")
  @ApiParam({ name: "id", description: "角色 ID（UUIDv7）" })
  @ApiOperation({ summary: "分配角色权限", description: "用传入的权限列表覆盖该角色当前权限。" })
  assignPermissions(@Param("id") id: string, @Body() body: AssignPermissionsDto) {
    return this.service.assignPermissions(id, body.permissionIds);
  }

  @Get("permissions")
  @RequirePermissions("permission.read")
  @ApiOperation({ summary: "权限列表" })
  listPermissions() {
    return this.service.listPermissions();
  }
}
