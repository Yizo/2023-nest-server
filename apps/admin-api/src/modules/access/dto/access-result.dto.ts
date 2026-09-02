import { ApiProperty } from "@nestjs/swagger";
import type { MenuAccessNode } from "../access.types";

export class AccessResult {
	@ApiProperty({ description: "当前用户可用的菜单树", type: "array" })
	menus!: MenuAccessNode[];

	@ApiProperty({ description: "当前用户可用的操作权限编码", type: [String] })
	permissions!: string[];
}
