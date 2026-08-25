import type { Opt } from "@mikro-orm/core";
import { Check, Entity, Property, Unique } from "@mikro-orm/decorators/legacy";
import { SoftDeleteEntity } from "@/common/entities/base.entity";

@Entity({ tableName: "sys_dict_type", comment: "字典类型" })
@Check({ name: "chk_sys_dict_type_status", expression: '"status" in (0, 1)' })
@Unique({
	name: "uq_sys_dict_type_code_active",
	properties: ["dictType"],
	where: { deletedAt: null },
})
export class DictTypeEntity extends SoftDeleteEntity {
	@Property({ fieldName: "dict_name", type: "string", length: 100, comment: "字典名称" })
	dictName!: string;

	@Property({
		fieldName: "dict_type",
		type: "string",
		length: 100,
		comment: "字典类型编码，创建后不可修改",
	})
	dictType!: string;

	@Property({ type: "smallint", default: 1, comment: "状态，0 停用，1 启用" })
	status: Opt<0 | 1> = 1;

	@Property({ type: "string", length: 500, nullable: true, comment: "备注" })
	remark: string | null = null;
}
