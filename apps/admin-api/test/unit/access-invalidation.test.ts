import { describe, expect, it, vi } from "vitest";
import { AccessInvalidation } from "@/modules/access/access-invalidation.service";
import { SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";

describe("AccessInvalidation", () => {
	it("invalidateRole 查出该角色下用户后交给缓存", async () => {
		const em = {
			execute: vi.fn().mockResolvedValue([{ user_id: 7 }, { user_id: 8 }]),
		};
		const cache = {
			invalidateUser: vi.fn(),
			invalidateUsers: vi.fn().mockResolvedValue(undefined),
		};
		const service = new AccessInvalidation(em as never, cache as never);

		await service.invalidateRole(3);

		expect(em.execute).toHaveBeenCalledWith(
			expect.stringContaining("sys_user_role"),
			[3],
			"all",
		);
		expect(cache.invalidateUsers).toHaveBeenCalledWith([7, 8]);
	});

	it("invalidateMenu 经 role_menu 和 user_role 查出用户", async () => {
		const em = {
			execute: vi.fn().mockResolvedValue([{ user_id: 4 }]),
		};
		const cache = {
			invalidateUser: vi.fn(),
			invalidateUsers: vi.fn().mockResolvedValue(undefined),
		};
		const service = new AccessInvalidation(em as never, cache as never);

		await service.invalidateMenu(9);

		const [sql, params] = em.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('"sys_role_menu"');
		expect(sql).toContain('"sys_user_role"');
		expect(sql).toContain('"sys_role"');
		expect(params).toEqual(expect.arrayContaining([9, SUPER_ADMIN_ROLE_CODE]));
		expect(cache.invalidateUsers).toHaveBeenCalledWith([4]);
	});

	it("invalidateUser 只失效这一个用户", async () => {
		const cache = {
			invalidateUser: vi.fn().mockResolvedValue(undefined),
			invalidateUsers: vi.fn(),
		};
		const service = new AccessInvalidation({ execute: vi.fn() } as never, cache as never);

		await service.invalidateUser(2);

		expect(cache.invalidateUser).toHaveBeenCalledWith(2);
		expect(cache.invalidateUsers).not.toHaveBeenCalled();
	});
});
