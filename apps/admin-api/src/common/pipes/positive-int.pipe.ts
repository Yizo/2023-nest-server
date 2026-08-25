import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";

/** 将数字主键转换集中在参数边界，避免 `+id` 把非法值静默转换成 NaN。 */
@Injectable()
export class PositiveIntPipe implements PipeTransform<string, number> {
	transform(value: string): number {
		if (!/^[1-9]\d*$/.test(value)) {
			throw new BadRequestException("ID 必须是正整数");
		}

		const id = Number(value);
		if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
			throw new BadRequestException("ID 必须是有效的正整数");
		}
		return id;
	}
}
