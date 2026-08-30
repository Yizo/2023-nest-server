import { ApiProperty } from "@nestjs/swagger";

export class DepartmentResult {
	@ApiProperty({ description: "主键" })
	id!: number;

	@ApiProperty({ description: "部门名称" })
	deptName!: string;

	@ApiProperty({ description: "父部门 ID，空表示根部门", nullable: true })
	parentId!: number | null;

	@ApiProperty({ description: "祖级部门 ID 列表，逗号分隔，不含自身" })
	ancestors!: string;

	@ApiProperty({ description: "排序，数值越小越靠前" })
	sort!: number;

	@ApiProperty({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	status!: 0 | 1;

	@ApiProperty({ description: "创建时间" })
	createdAt!: Date;

	@ApiProperty({ description: "更新时间" })
	updatedAt!: Date;
}
