import { defineEntity, p } from "@mikro-orm/core";

/** 业务表共用的主键和时间戳，本身不映射为物理表。 */
export const BaseEntitySchema = defineEntity({
	name: "BaseEntity",
	abstract: true,
	properties: {
		id: p.integer()
			.primary()
			.autoincrement()
			.comment("主键"),
		createdAt: p.datetime()
			.columnType("timestamptz")
			.fieldName("created_at")
			.onCreate(() => new Date())
			.comment("创建时间"),
		updatedAt: p.datetime()
			.columnType("timestamptz")
			.fieldName("updated_at")
			.onCreate(() => new Date())
			.onUpdate(() => new Date())
			.comment("更新时间"),
	},
});

export abstract class BaseEntity extends BaseEntitySchema.class {}

BaseEntitySchema.setClass(BaseEntity);

/** 需要软删除的实体继承此 schema；业务查询显式过滤 deletedAt 为空。 */
export const SoftDeleteEntitySchema = defineEntity({
	name: "SoftDeleteEntity",
	abstract: true,
	extends: BaseEntitySchema,
	properties: {
		deletedAt: p.datetime()
			.columnType("timestamptz")
			.fieldName("deleted_at")
			.nullable()
			.comment("软删除时间，空表示有效"),
	},
});

export abstract class SoftDeleteEntity extends SoftDeleteEntitySchema.class {}

SoftDeleteEntitySchema.setClass(SoftDeleteEntity);
