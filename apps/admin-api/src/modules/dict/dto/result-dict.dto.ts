import { ApiProperty } from "@nestjs/swagger";

export class DictTypeResult {
	@ApiProperty({ description: "主键" })
	id!: number;

	@ApiProperty({ description: "字典名称" })
	dictName!: string;

	@ApiProperty({ description: "字典类型编码" })
	dictType!: string;

	@ApiProperty({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	status!: 0 | 1;

	@ApiProperty({ description: "备注", nullable: true })
	remark!: string | null;

	@ApiProperty({ description: "创建时间" })
	createdAt!: Date;

	@ApiProperty({ description: "更新时间" })
	updatedAt!: Date;
}

export class DictDataResult {
	@ApiProperty({ description: "主键" })
	id!: number;

	@ApiProperty({ description: "所属字典类型编码" })
	dictType!: string;

	@ApiProperty({ description: "字典标签" })
	label!: string;

	@ApiProperty({ description: "字典值" })
	value!: string;

	@ApiProperty({ description: "排序" })
	sort!: number;

	@ApiProperty({ description: "状态，0 停用，1 启用", enum: [0, 1] })
	status!: 0 | 1;

	@ApiProperty({ description: "备注", nullable: true })
	remark!: string | null;

	@ApiProperty({ description: "创建时间" })
	createdAt!: Date;

	@ApiProperty({ description: "更新时间" })
	updatedAt!: Date;
}
