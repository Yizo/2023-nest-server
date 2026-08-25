import type { Opt, Rel } from "@mikro-orm/core";
import { Entity, Index, ManyToOne, Property, Unique } from "@mikro-orm/decorators/legacy";
import { SoftDeleteEntity } from "@/common/entities/base.entity";
import { DictTypeEntity } from "./dict-type.entity";

@Entity({ tableName: "sys_dict_data", comment: "字典数据" })
@Unique({
	name: "uq_sys_dict_data_type_value_active",
	properties: ["dictType", "value"],
	where: { deletedAt: null },
})
@Index({
	name: "idx_sys_dict_data_type_active",
	properties: ["dictType"],
	where: { deletedAt: null },
})
export class DictDataEntity extends SoftDeleteEntity {
	@ManyToOne(() => DictTypeEntity, {
		joinColumn: "dict_type_id",
		createForeignKeyConstraint: false,
		comment: "字典类型 ID",
	})
	dictType!: Rel<DictTypeEntity>;

	@Property({ type: "string", length: 100, comment: "字典标签" })
	label!: string;

	@Property({ type: "string", length: 100, comment: "字典值" })
	value!: string;

	@Property({ type: "integer", default: 0, comment: "排序，数值越小越靠前" })
	sort: Opt<number> = 0;

	@Property({ type: "smallint", default: 1, comment: "状态，0 停用，1 启用" })
	status: Opt<0 | 1> = 1;

	@Property({ type: "string", length: 500, nullable: true, comment: "备注" })
	remark: string | null = null;
}
