import type { Rel } from "@mikro-orm/core";
import { Entity, Index, ManyToOne, Unique } from "@mikro-orm/decorators/legacy";
import { SoftDeleteEntity } from "@/common/entities/base.entity";
import { DictDataEntity } from "./dict-data.entity";
import { DictTypeEntity } from "./dict-type.entity";

/** 独立实体明确管理关联表，避免 ManyToMany 隐式生成表结构。 */
@Entity({ tableName: "sys_dict_type_data", comment: "字典类型与字典数据的关联" })
@Unique({
	name: "uq_sys_dict_type_data_data_active",
	properties: ["dictData"],
	where: { deletedAt: null },
})
@Index({
	name: "idx_sys_dict_type_data_type_active",
	properties: ["dictType"],
	where: { deletedAt: null },
})
export class DictTypeDataEntity extends SoftDeleteEntity {
	@ManyToOne(() => DictTypeEntity, {
		joinColumn: "dict_type_id",
		createForeignKeyConstraint: false,
		comment: "字典类型 ID",
	})
	dictType!: Rel<DictTypeEntity>;

	@ManyToOne(() => DictDataEntity, {
		joinColumn: "dict_data_id",
		createForeignKeyConstraint: false,
		comment: "字典数据 ID",
	})
	dictData!: Rel<DictDataEntity>;
}
