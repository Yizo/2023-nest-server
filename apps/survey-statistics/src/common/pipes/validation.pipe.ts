import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";

/** 从 class-validator 的树形错误中提取第一条提示。 */
export function firstValidationMessage(errors: ValidationError[]): string {
	const error = errors[0];
	if (!error) return "请求参数不正确";

	// forbidNonWhitelisted 产生的默认英文提示在这里统一翻译。
	if (error.constraints?.whitelistValidation) {
		return `不允许提交字段：${error.property}`;
	}

	const message = error.constraints ? Object.values(error.constraints)[0] : undefined;
	if (message) return message;
	// 嵌套 DTO 的错误位于 children 中，因此递归读取。
	if (error.children?.length) return firstValidationMessage(error.children);
	return `${error.property}参数不正确`;
}

/** 创建全局 HTTP 参数校验管道。 */
export function createValidationPipe(): ValidationPipe {
	return new ValidationPipe({
		// 把 query/body 的基础类型转换成 DTO 声明的类型。
		transform: true,
		// 删除 DTO 未声明的字段。
		whitelist: true,
		// 遇到未声明字段时直接报错，而不是静默丢弃。
		forbidNonWhitelisted: true,
		// 同一个字段只执行到第一条失败规则。
		stopAtFirstError: true,
		// 不把原始对象和值放进错误结果，避免泄漏密码等输入。
		validationError: { target: false, value: false },
		// 整个请求无论有多少字段错误，只向客户端返回第一条中文提示。
		exceptionFactory: (errors) => new BadRequestException(firstValidationMessage(errors)),
	});
}
