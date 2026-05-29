import { UnauthorizedException } from "@nestjs/common";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { JwtErrorCode, JwtErrorMessages } from "@/enums/jwt";
import { JwtAuthGuard } from "@/modules/auth/jwt/jwt.guard";

describe("JwtAuthGuard.handleRequest", () => {
	let guard: JwtAuthGuard;

	beforeEach(() => {
		guard = new JwtAuthGuard({} as never, { get: jest.fn() } as never);
	});

	function getUnauthorizedBody(fn: () => unknown): {
		code: number;
		message: string;
	} {
		try {
			fn();
		} catch (error) {
			expect(error).toBeInstanceOf(UnauthorizedException);
			return (error as UnauthorizedException).getResponse() as {
				code: number;
				message: string;
			};
		}
		throw new Error("expected UnauthorizedException");
	}

	it("returns user when authentication succeeds", () => {
		const user = { userId: "1", username: "test" };
		expect(guard.handleRequest(null, user, null)).toBe(user);
	});

	it("throws 1001 when no auth token is provided", () => {
		const body = getUnauthorizedBody(() =>
			guard.handleRequest(null, null, { message: "No auth token" }),
		);
		expect(body).toEqual({
			code: JwtErrorCode.NO_TOKEN_PROVIDED,
			message: JwtErrorMessages[JwtErrorCode.NO_TOKEN_PROVIDED],
		});
	});

	it("throws 1006 when err is JsonWebTokenError", () => {
		const body = getUnauthorizedBody(() =>
			guard.handleRequest(new JsonWebTokenError("jwt malformed"), null, null),
		);
		expect(body.code).toBe(JwtErrorCode.TOKEN_MALFORMED);
	});

	it("throws 1006 when info is JsonWebTokenError without user", () => {
		const body = getUnauthorizedBody(() =>
			guard.handleRequest(null, null, new JsonWebTokenError("jwt malformed")),
		);
		expect(body.code).toBe(JwtErrorCode.TOKEN_MALFORMED);
	});

	it("throws 1002 when err is TokenExpiredError", () => {
		const body = getUnauthorizedBody(() =>
			guard.handleRequest(new TokenExpiredError("jwt expired", new Date()), null, null),
		);
		expect(body.code).toBe(JwtErrorCode.TOKEN_EXPIRED);
	});

	it("rethrows UnauthorizedException from strategy unchanged", () => {
		const strategyError = new UnauthorizedException({
			code: JwtErrorCode.TOKEN_EXPIRED,
			message: JwtErrorMessages[JwtErrorCode.TOKEN_EXPIRED],
		});
		expect(() => guard.handleRequest(strategyError, null, null)).toThrow(
			strategyError,
		);
	});

	it("throws 1005 as fallback when user is missing without recognizable info", () => {
		const body = getUnauthorizedBody(() => guard.handleRequest(null, null, {}));
		expect(body.code).toBe(JwtErrorCode.TOKEN_VALIDATION_FAILED);
	});
});
