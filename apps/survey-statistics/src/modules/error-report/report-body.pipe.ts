import {
	ArgumentMetadata,
	BadRequestException,
	Injectable,
	PipeTransform,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { toReportItems } from "./coerce-report-body";
import { ReportMonitorBatchDto } from "./dto/report-monitor-batch.dto";
import { ReportMonitorPayloadDto } from "./dto/report-monitor-payload.dto";

const VALIDATE_OPTIONS = {
	whitelist: true,
	forbidNonWhitelisted: false,
};

function formatValidationMessage(errors: ValidationError[]): string {
	for (const err of errors) {
		if (err.property === "items" && err.children?.length) {
			for (const itemErr of err.children) {
				const index = Number(itemErr.property);
				const fieldErr = itemErr.children?.find((c) => c.constraints);
				if (fieldErr?.constraints) {
					const msg = Object.values(fieldErr.constraints)[0];
					return Number.isNaN(index)
						? msg
						: `第 ${index + 1} 条: ${msg}`;
				}
			}
		}
		if (err.constraints) {
			return Object.values(err.constraints)[0];
		}
	}
	return "参数校验失败";
}

/**
 * 上报 POST 专用：单条/批量规范 + ValidateNested 校验（允许 SDK 额外字段）。
 * Body 须已由中间件解析为对象/数组（application/json 或 text/plain）。
 */
@Injectable()
export class ReportBodyPipe implements PipeTransform {
	async transform(
		value: unknown,
		_metadata: ArgumentMetadata,
	): Promise<ReportMonitorPayloadDto[]> {
		const items = toReportItems(value);
		const batch = plainToInstance(
			ReportMonitorBatchDto,
			{ items },
			{ enableImplicitConversion: true },
		);
		const errors = await validate(batch, VALIDATE_OPTIONS);

		if (errors.length > 0) {
			throw new BadRequestException(formatValidationMessage(errors));
		}

		return batch.items;
	}
}
