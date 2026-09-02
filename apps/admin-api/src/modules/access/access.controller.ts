import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthRequired, CurrentUser } from "@/common/decorators";
import type { AuthenticatedUser } from "@/common/types";
import { AccessResult } from "./dto";
import { PermissionService } from "./permission.service";

@ApiTags("认证")
@Controller("auth")
export class AccessController {
	constructor(private readonly permissions: PermissionService) {}

	@Get("access")
	@AuthRequired()
	@ApiOperation({ summary: "当前用户菜单和操作权限" })
	@ApiResponse({ type: AccessResult })
	access(@CurrentUser() user: AuthenticatedUser) {
		return this.permissions.getAccess(user.id);
	}
}
