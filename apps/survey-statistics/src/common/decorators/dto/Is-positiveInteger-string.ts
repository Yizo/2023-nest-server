import { ValidationOptions, registerDecorator, ValidationArguments } from "class-validator";

// 验证字符串是否为正整数
export function IsPositiveIntegerString(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "isPositiveIntegerString",
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any) {
					// 必须是字符串类型
					if (typeof value !== "string") {
						return false;
					}

					// 使用正则表达式验证正整数格式
					return /^[1-9]\d*$/.test(value);
				},
				defaultMessage(args: ValidationArguments) {
					return `${args.property} must be a string representing a positive integer`;
				},
			},
		});
	};
}
