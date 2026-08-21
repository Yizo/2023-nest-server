import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { firstValidationMessage } from "@/common/pipes/validation.pipe";
import { SdkErrorReportDto } from "./monitoring.dto";

/** 把 SDK 的单条对象或批量数组统一转换成经过校验的 DTO 数组。 */
@Injectable()
export class SdkErrorReportPipe implements PipeTransform<unknown, Promise<SdkErrorReportDto[]>> {
	async transform(value: unknown): Promise<SdkErrorReportDto[]> {
		const items = Array.isArray(value) ? value : [value];
		if (items.length === 0) throw new BadRequestException("错误上报内容不能为空");
		if (items.length > 100) throw new BadRequestException("一次最多上报 100 条错误");

		const result: SdkErrorReportDto[] = [];
		for (const item of items) {
			const dto = plainToInstance(SdkErrorReportDto, item);
			const errors = await validate(dto, {
				whitelist: true,
				forbidNonWhitelisted: true,
				stopAtFirstError: true,
				validationError: { target: false, value: false },
			});
			if (errors.length) throw new BadRequestException(firstValidationMessage(errors));
			result.push(dto);
		}
		return result;
	}
}
