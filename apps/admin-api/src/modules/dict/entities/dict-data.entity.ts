import type { Opt } from "@mikro-orm/core";
import { Check, Entity, Property } from "@mikro-orm/decorators/legacy";
import { SoftDeleteEntity } from "@/common/entities/base.entity";

@Entity({ tableName: "sys_dict_data", comment: "字典数据" })
@Check({ name: "chk_sys_dict_data_status", expression: '"status" in (0, 1)' })
export class DictDataEntity extends SoftDeleteEntity {
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
