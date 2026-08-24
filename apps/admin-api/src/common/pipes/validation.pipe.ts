import { BadRequestException, ValidationPipe, type ValidationError } from "@nestjs/common";

/** 从 class-validator 错误树中提取第一条可读的中文提示。 */
export function firstValidationMessage(errors: ValidationError[]): string {
	for (const error of errors) {
		const constraints = error.constraints ?? {};
		const firstConstraint = Object.values(constraints)[0];
		if (firstConstraint) {
			if (constraints.whitelistValidation) return `不允许提交字段 ${error.property}`;
			return firstConstraint;
		}

		const nestedMessage = firstValidationMessage(error.children ?? []);
		if (nestedMessage !== "请求参数不正确") return nestedMessage;
	}

	return "请求参数不正确";
}

/** 创建全局输入校验管道，所有新业务 DTO 默认继承这套边界规则。 */
export function createValidationPipe(): ValidationPipe {
	return new ValidationPipe({
		transform: true,
		whitelist: true,
		forbidNonWhitelisted: true,
		stopAtFirstError: true,
		exceptionFactory: (errors) => new BadRequestException(firstValidationMessage(errors)),
	});
}
