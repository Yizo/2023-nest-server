import { PipeTransform, Injectable } from "@nestjs/common";
import { formatPage } from "@base/utils";
import type { FormatOptions } from "@base/utils";

@Injectable()
export class PagePipe implements PipeTransform {
	private readonly options: FormatOptions;
	constructor(options?: FormatOptions) {
		this.options = options ?? { maxPageSize: 100 };
	}

	transform(value: any) {
		// 合并作为下一个管道的value参数
		return {
			...value,
			...formatPage(value.page, value.pageSize, this.options),
		};
	}
}
