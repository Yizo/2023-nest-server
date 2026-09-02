import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PermissionService } from "@/modules/access/permission.service";
import { SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";

describe("PermissionService.assertPermissions", () => {
	it("空要求直接通过", async () => {
		const service = new PermissionService({ execute: vi.fn() } as never, {} as never);
		await expect(service.assertPermissions(1, [])).resolves.toBeUndefined();
	});

	it("缺少任一编码则 403", async () => {
		const cache = { getPermissions: vi.fn().mockResolvedValue(["user:list"]) };
		const service = new PermissionService({ execute: vi.fn() } as never, cache as never);
		await expect(service.assertPermissions(1, ["user:list", "user:create"])).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it("超管通配符放行全部编码", async () => {
		const cache = { getPermissions: vi.fn().mockResolvedValue(["*"]) };
		const service = new PermissionService({ execute: vi.fn() } as never, cache as never);
		await expect(service.assertPermissions(1, ["user:create"])).resolves.toBeUndefined();
	});

	it("缓存未命中且角色为超管时写入 *", async () => {
		const cache = {
			getPermissions: vi.fn().mockResolvedValue(null),
			setPermissions: vi.fn().mockResolvedValue(undefined),
		};
		const em = {
			execute: vi.fn().mockResolvedValue([{ role_code: SUPER_ADMIN_ROLE_CODE }]),
		};
		const service = new PermissionService(em as never, cache as never);
		await expect(service.getPermissions(1)).resolves.toEqual(["*"]);
		expect(cache.setPermissions).toHaveBeenCalledWith(1, ["*"]);
	});
});
