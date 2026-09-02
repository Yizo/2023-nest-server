import { describe, expect, it, vi } from "vitest";
import { RoleGrantCommand } from "@/modules/role/role-grant.command";

describe("RoleGrantCommand", () => {
	it("clearGrantsByMenu 只委托清关联，不碰缓存", async () => {
		const roleMenus = {
			clearMenuRoles: vi.fn().mockResolvedValue(undefined),
		};
		const command = new RoleGrantCommand(roleMenus as never);
		const em = {} as never;

		await command.clearGrantsByMenu(em, 11);

		expect(roleMenus.clearMenuRoles).toHaveBeenCalledWith(em, 11);
	});
});
