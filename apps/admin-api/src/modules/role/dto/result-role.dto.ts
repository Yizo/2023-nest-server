import { ApiProperty } from "@nestjs/swagger";

export class RoleResult {
	@ApiProperty({ description: "主键" })
	id!: number;

	@ApiProperty({ description: "角色名称" })
	roleName!: string;

	@ApiProperty({ description: "角色编码" })
	roleCode!: string;

	@ApiProperty({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	status!: 0 | 1;

	@ApiProperty({ description: "备注", nullable: true })
	remark!: string | null;

	@ApiProperty({ description: "菜单和操作权限 ID", type: [Number] })
	menuIds!: number[];

	@ApiProperty({ description: "创建时间" })
	createdAt!: Date;

	@ApiProperty({ description: "更新时间" })
	updatedAt!: Date;
}
