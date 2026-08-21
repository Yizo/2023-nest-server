import { sanitizeLogField, sanitizeLogValue } from "@/common/logger";
import { Test } from "@nestjs/testing";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppLoggerModule } from "@/common/logger";

describe("sanitizeLogValue", () => {
  it("递归清理密码、Authorization、Cookie 和 JWT", () => {
    const result = sanitizeLogValue({
      password: "plain-password",
      request: {
        authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
        cookie: "session=secret",
        message: "token eyJhbGciOiJIUzI1NiJ9.payload.signature",
      },
    });
    expect(JSON.stringify(result)).not.toContain("plain-password");
    expect(JSON.stringify(result)).not.toContain("session=secret");
    expect(JSON.stringify(result)).not.toContain("payload.signature");
  });

  it("清理 Winston 顶层敏感字段", () => {
    expect(sanitizeLogField("password", "plain-password")).toBe("[REDACTED]");
    expect(sanitizeLogField("authorization", "Bearer secret-token")).toBe("[REDACTED]");
  });

  it("可以作为 Nest 全局 Logger provider 初始化", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppLoggerModule] }).compile();
    expect(moduleRef.get(WINSTON_MODULE_NEST_PROVIDER)).toBeDefined();
    await moduleRef.close();
  });
});
