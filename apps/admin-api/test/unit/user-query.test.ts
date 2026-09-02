import { describe, expect, it, vi } from "vitest";
import { UserQuery } from "@/modules/user/user-query.service";

describe("UserQuery.verifyLogin", () => {
	it("账号不存在返回 null", async () => {
		const data = {
			normalizeUserName: vi.fn((value: string) => value),
			findUserForLogin: vi.fn().mockResolvedValue(null),
		};
		const query = new UserQuery({} as never, data as never);
		await expect(query.verifyLogin({} as never, "admin", "secret")).resolves.toBeNull();
	});

	it("停用账号返回 null", async () => {
		const data = {
			normalizeUserName: vi.fn((value: string) => value),
			findUserForLogin: vi.fn().mockResolvedValue({
				id: 1,
				userName: "admin",
				passwordHash: "hash",
				status: 0,
			}),
		};
		const query = new UserQuery({} as never, data as never);
		await expect(query.verifyLogin({} as never, "admin", "secret")).resolves.toBeNull();
	});
});
