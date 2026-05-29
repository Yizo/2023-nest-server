import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { ReportMonitorPayloadDto } from "./report-monitor-payload.dto";

/** 管道内部用：将已规范为数组的上报体做一次性嵌套校验 */
export class ReportMonitorBatchDto {
	@IsArray()
	@ArrayMinSize(1, { message: "上报数据不能为空" })
	@ValidateNested({ each: true })
	@Type(() => ReportMonitorPayloadDto)
	items!: ReportMonitorPayloadDto[];
}
