import { BadRequestException, ExecutionContext, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of } from "rxjs";
import { AuthRequired, Public } from "../../src/common/decorators";
import { HttpExceptionFilter } from "../../src/common/filters";
import { AuthPlaceholderGuard } from "../../src/common/guards";
import { ResponseInterceptor } from "../../src/common/interceptors";
import { firstValidationMessage } from "../../src/common/pipes";

function executionContext(request: Record<string, unknown> = {}): ExecutionContext {
	return {
		getHandler: () => () => undefined,
		getClass: () => class TestController {},
		switchToHttp: () => ({
			getRequest: () => request,
			getResponse: () => ({ statusCode: 200 }),
		}),
	} as unknown as ExecutionContext;
}

describe("global scaffold components", () => {
	it("wraps successful responses with request metadata", async () => {
		const interceptor = new ResponseInterceptor();
		const result = await lastValueFrom(
			interceptor.intercept(executionContext({ requestId: "req-1" }), { handle: () => of({ ok: true }) }),
		);

		expect(result).toMatchObject({ code: 0, message: "成功", data: { ok: true }, requestId: "req-1" });
	});

	it("allows public routes and rejects explicitly protected routes before auth exists", () => {
		const reflector = new Reflector();
		const guard = new AuthPlaceholderGuard(reflector);
		const publicContext = executionContext();
		const publicHandler = publicContext.getHandler();
		Public()(publicHandler);
		expect(guard.canActivate(publicContext)).toBe(true);

		const protectedHandler = () => undefined;
		AuthRequired()(protectedHandler);
		const protectedContext = {
			getHandler: () => protectedHandler,
			getClass: () => class TestController {},
		} as unknown as ExecutionContext;
		expect(() => guard.canActivate(protectedContext)).toThrow("认证模块尚未接入");
	});

	it("returns the first validation message", () => {
		const message = firstValidationMessage([
			{ property: "email", constraints: { isEmail: "邮箱格式不正确" } },
			{ property: "name", constraints: { isNotEmpty: "名称不能为空" } },
		]);
		expect(message).toBe("邮箱格式不正确");
	});

	it("formats HTTP exceptions with the unified error envelope", () => {
		const filter = new HttpExceptionFilter();
		const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
		const host = {
			switchToHttp: () => ({
				getResponse: () => response,
				getRequest: () => ({ requestId: "req-2", method: "GET", path: "/api/v1/test" }),
			}),
		} as unknown as Parameters<HttpExceptionFilter["catch"]>[1];

		filter.catch(new BadRequestException("请求参数不正确"), host);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
			code: 400,
			message: "请求参数不正确",
			requestId: "req-2",
		}));
	});

	it("replaces framework default route messages with Chinese text", () => {
		const filter = new HttpExceptionFilter();
		const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
		const host = {
			switchToHttp: () => ({
				getResponse: () => response,
				getRequest: () => ({ requestId: "req-3", method: "GET", path: "/missing" }),
			}),
		} as unknown as Parameters<HttpExceptionFilter["catch"]>[1];

		filter.catch(new NotFoundException("Cannot GET /missing"), host);

		expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
			code: 404,
			message: "资源不存在",
		}));
	});
});
