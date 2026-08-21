import type { EntityManager } from "@mikro-orm/postgresql";
import { jest } from "@jest/globals";
import { AuthorizationService } from "@/modules/identity/authorization.service";

describe("AuthorizationService", () => {
  const findOne = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const execute = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
  const em = {
    findOne,
    getConnection: () => ({ execute }),
  } as unknown as EntityManager;
  const service = new AuthorizationService(em);

  it("allows a request that has no permission requirement", async () => {
    await expect(service.hasAllPermissions("user-id", [])).resolves.toBe(true);
    expect(findOne).not.toHaveBeenCalled();
  });

  it("rejects a missing or disabled user", async () => {
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "disabled", isPlatformOwner: false });

    await expect(service.hasAllPermissions("missing", ["survey.read"])).resolves.toBe(false);
    await expect(service.hasAllPermissions("disabled", ["survey.read"])).resolves.toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it("lets the platform owner bypass role permissions", async () => {
    findOne.mockResolvedValue({ status: "active", isPlatformOwner: true });

    await expect(service.hasAllPermissions("owner", ["role.create", "survey.publish"])).resolves.toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("requires every permission and binds permission arrays with IN", async () => {
    findOne.mockResolvedValue({ status: "active", isPlatformOwner: false });
    execute.mockResolvedValue([{ code: "survey.read" }, { code: "survey.respond" }]);

    await expect(service.hasAllPermissions("user-id", ["survey.read", "survey.respond"])).resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("p.code in (?)"), [
      "user-id",
      ["survey.read", "survey.respond"],
    ]);

    execute.mockResolvedValueOnce([{ code: "survey.read" }]);
    await expect(service.hasAllPermissions("user-id", ["survey.read", "survey.respond"])).resolves.toBe(false);
  });
});
