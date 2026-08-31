import { PartialType, PickType } from "@nestjs/swagger";
import { CreateMenuDto } from "./create-menu.dto";

export class UpdateMenuDto extends PartialType(
	PickType(CreateMenuDto, [
		"parentId",
		"name",
		"code",
		"routeName",
		"path",
		"component",
		"redirect",
		"icon",
		"sort",
		"visible",
		"keepAlive",
	] as const),
) {}
