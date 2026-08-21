import { BadRequestException } from "@nestjs/common";
import { createValidationPipe } from "@/common/pipes/validation.pipe";
import { LoginDto } from "@/modules/auth/auth.dto";

describe("createValidationPipe", () => {
	it("只返回一条中文校验提示", async () => {
		const pipe = createValidationPipe();

		try {
			await pipe.transform(
				{ username: 123, password: "", unexpected: true },
				{ type: "body", metatype: LoginDto },
			);
			throw new Error("期望参数校验失败");
		} catch (error) {
			expect(error).toBeInstanceOf(BadRequestException);
			const response = (error as BadRequestException).getResponse() as { message: string };
			expect(typeof response.message).toBe("string");
			expect(response.message).not.toMatch(/property|must be|should not exist/i);
		}
	});
});
