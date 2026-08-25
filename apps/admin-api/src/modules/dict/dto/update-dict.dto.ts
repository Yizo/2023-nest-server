import { PartialType, PickType } from "@nestjs/swagger";
import { CreateDictDataDto, CreateDictTypeDto } from "./create-dict.dto";

export class UpdateDictTypeDto extends PartialType(
	PickType(CreateDictTypeDto, ["dictName", "status", "remark"] as const),
) {}

export class UpdateDictDataDto extends PartialType(
	PickType(CreateDictDataDto, ["label", "value", "sort", "status", "remark"] as const),
) {}
