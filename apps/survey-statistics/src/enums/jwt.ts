// 请求头中的tokenKey
export const TOKEN_KEY = "token";

export enum JwtErrorCode {
	NO_TOKEN_PROVIDED = 1001,
	TOKEN_EXPIRED = 1002,
	TOKEN_INVALID = 1003,
	TOKEN_VERIFICATION_FAILED = 1004,
	TOKEN_VALIDATION_FAILED = 1005,
	TOKEN_MALFORMED = 1006,
	TOKEN_NOT_BEFORE_INVALID = 1010,
}

export const JwtErrorMessages: Record<JwtErrorCode, string> = {
	[JwtErrorCode.NO_TOKEN_PROVIDED]: "未提供访问令牌",
	[JwtErrorCode.TOKEN_EXPIRED]: "访问令牌已过期",
	[JwtErrorCode.TOKEN_INVALID]: "访问令牌无效",
	[JwtErrorCode.TOKEN_VERIFICATION_FAILED]: "访问令牌验证失败",
	[JwtErrorCode.TOKEN_VALIDATION_FAILED]: "访问令牌验证失败",
	[JwtErrorCode.TOKEN_MALFORMED]: "访问令牌格式错误",
	[JwtErrorCode.TOKEN_NOT_BEFORE_INVALID]: "访问令牌尚未生效",
};
