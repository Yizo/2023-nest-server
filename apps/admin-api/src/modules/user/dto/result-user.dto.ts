import { ApiProperty } from "@nestjs/swagger";

export class UserResult {
	@ApiProperty({ description: "主键" })
	id!: number;

	@ApiProperty({ description: "用户账号" })
	userName!: string;

	@ApiProperty({ description: "显示名称" })
	displayName!: string;

	@ApiProperty({ description: "部门 ID 列表", type: [Number] })
	deptIds!: number[];

	@ApiProperty({ description: "角色 ID 列表", type: [Number] })
	roleIds!: number[];

	@ApiProperty({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	status!: 0 | 1;

	@ApiProperty({ description: "创建时间" })
	createdAt!: Date;

	@ApiProperty({ description: "更新时间" })
	updatedAt!: Date;
}
