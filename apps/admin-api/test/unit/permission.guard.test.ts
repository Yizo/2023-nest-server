import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS_KEY, PUBLIC_ROUTE_KEY } from "@/common/decorators";
import { PermissionGuard } from "@/modules/access/permission.guard";

describe("PermissionGuard", () => {
	it("Public 直接通过", async () => {
		const reflector = {
			getAllAndOverride: vi.fn((key: string) => key === PUBLIC_ROUTE_KEY),
		};
		const permissions = { assertPermissions: vi.fn() };
		const guard = new PermissionGuard(reflector as never, permissions as never);
		const ctx = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
		};
		await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
		expect(permissions.assertPermissions).not.toHaveBeenCalled();
	});

	it("没有 RequirePermissions 则跳过", async () => {
		const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
		const permissions = { assertPermissions: vi.fn() };
		const guard = new PermissionGuard(reflector as never, permissions as never);
		const ctx = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ user: { id: 1 } }) }),
		};
		await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
		expect(permissions.assertPermissions).not.toHaveBeenCalled();
	});

	it("有权限元数据但 request.user 为空则 401", async () => {
		const reflector = {
			getAllAndOverride: vi.fn((key: string) => (key === PERMISSIONS_KEY ? ["user:list"] : undefined)),
		};
		const guard = new PermissionGuard(reflector as never, { assertPermissions: vi.fn() } as never);
		const ctx = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
		};
		await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException);
	});
});
