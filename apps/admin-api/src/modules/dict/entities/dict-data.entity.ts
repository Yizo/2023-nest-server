import { defineEntity, p } from "@mikro-orm/core";
import { SoftDeleteEntitySchema } from "@/common/entities/base.entity";
import { DictTypeEntity } from "./dict-type.entity";

const DictDataSchema = defineEntity({
	name: "DictDataEntity",
	tableName: "sys_dict_data",
	comment: "字典数据",
	extends: SoftDeleteEntitySchema,
	properties: {
		dictType: () =>
			p
				.manyToOne(DictTypeEntity)
				.joinColumn("dict_type_id")
				.createForeignKeyConstraint(false)
				.cascade()
				.comment("字典类型 ID"),
		label: p.string().length(100).comment("字典标签"),
		value: p.string().length(100).comment("字典值"),
		sort: p.integer().default(0).comment("排序，数值越小越靠前"),
		status: p.smallint().$type<0 | 1>().default(1).comment("状态，0 停用，1 启用"),
		remark: p.string().length(500).nullable().comment("备注"),
	},
	indexes: [
		{
			name: "idx_sys_dict_data_type_active",
			properties: ["dictType"],
			where: { deletedAt: null },
		},
	],
	uniques: [
		{
			name: "uq_sys_dict_data_type_value_active",
			properties: ["dictType", "value"],
			where: { deletedAt: null },
		},
	],
});

export class DictDataEntity extends DictDataSchema.class {}

DictDataSchema.setClass(DictDataEntity);
