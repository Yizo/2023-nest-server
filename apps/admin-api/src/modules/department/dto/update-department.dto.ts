import { PartialType, PickType } from "@nestjs/swagger";
import { CreateDepartmentDto } from "./create-department.dto";

export class UpdateDepartmentDto extends PartialType(
	PickType(CreateDepartmentDto, ["deptName", "parentId", "sort", "status"] as const),
) {}
