import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AUTH_REQUIRED_KEY, PUBLIC_ROUTE_KEY } from "@/common/decorators";
import { AuthGuard } from "@/modules/auth/auth.guard";

function contextWith(meta: { public?: boolean; authRequired?: boolean }, authorization?: string) {
	return {
		getHandler: () => ({}),
		getClass: () => ({}),
		switchToHttp: () => ({
			getRequest: () => ({ headers: { authorization }, user: undefined }),
		}),
	};
}

describe("AuthGuard", () => {
	it("Public 不校验 token", async () => {
		const reflector = {
			getAllAndOverride: vi.fn((key: string) => key === PUBLIC_ROUTE_KEY),
		};
		const auth = { validateAccessToken: vi.fn() };
		const guard = new AuthGuard(reflector as never, auth as never);
		await expect(guard.canActivate(contextWith({}) as never)).resolves.toBe(true);
		expect(auth.validateAccessToken).not.toHaveBeenCalled();
	});

	it("未标注默认拒绝", async () => {
		const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
		const guard = new AuthGuard(reflector as never, { validateAccessToken: vi.fn() } as never);
		await expect(guard.canActivate(contextWith({}) as never)).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it("AuthRequired 且缺少 Bearer 则 401", async () => {
		const reflector = {
			getAllAndOverride: vi.fn((key: string) => key === AUTH_REQUIRED_KEY),
		};
		const guard = new AuthGuard(reflector as never, { validateAccessToken: vi.fn() } as never);
		await expect(guard.canActivate(contextWith({}, undefined) as never)).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it("AuthRequired 且 token 有效则写入 request.user", async () => {
		const request = { headers: { authorization: "Bearer tok" }, user: undefined };
		const reflector = {
			getAllAndOverride: vi.fn((key: string) => key === AUTH_REQUIRED_KEY),
		};
		const auth = {
			validateAccessToken: vi.fn().mockResolvedValue({ id: 1, userName: "admin" }),
		};
		const guard = new AuthGuard(reflector as never, auth as never);
		const ctx = {
			getHandler: () => ({}),
			getClass: () => ({}),
			switchToHttp: () => ({ getRequest: () => request }),
		};
		await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
		expect(request.user).toEqual({ id: 1, userName: "admin" });
	});
});
