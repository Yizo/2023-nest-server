import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";

const DictTypeSchema = defineEntity({
	name: "DictTypeEntity",
	tableName: "sys_dict_type",
	comment: "字典类型",
	extends: SoftDeleteEntitySchema,
	properties: {
		dictName: p.string().length(100).fieldName("dict_name").comment("字典名称"),
		dictType: p
			.string()
			.length(100)
			.fieldName("dict_type")
			.comment("字典类型编码，创建后不可修改"),
		status: p.smallint().$type<0 | 1>().default(1).comment("状态，0 停用，1 启用"),
		remark: p.string().length(500).nullable().comment("备注"),
	},
	uniques: [
		{
			name: "uq_sys_dict_type_code_active",
			properties: ["dictName", "dictType"],
			where: { deletedAt: null },
		},
	],
});

export class DictTypeEntity extends DictTypeSchema.class {}

DictTypeSchema.setClass(DictTypeEntity);
