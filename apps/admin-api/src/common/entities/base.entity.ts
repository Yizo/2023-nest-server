import type { Opt } from "@mikro-orm/core";
import { PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

/**
 * 业务表共用的主键和时间戳。
 * 不要加 `@Entity()`：基类只做字段映射，本身不是一张表。
 */
export abstract class BaseEntity {
	@PrimaryKey({ type: "integer", autoincrement: true, comment: "主键" })
	id!: number;

	@Property({
		fieldName: "created_at",
		type: "timestamptz",
		onCreate: () => new Date(),
		comment: "创建时间",
	})
	createdAt: Opt<Date> = new Date();

	@Property({
		fieldName: "updated_at",
		type: "timestamptz",
		onCreate: () => new Date(),
		onUpdate: () => new Date(),
		comment: "更新时间",
	})
	updatedAt: Opt<Date> = new Date();
}

/**
 * 需要软删除的表继承这个类。查询时过滤 `deletedAt == null`。
 */
export abstract class SoftDeleteEntity extends BaseEntity {
	@Property({
		fieldName: "deleted_at",
		type: "timestamptz",
		nullable: true,
		comment: "软删除时间，空表示有效",
	})
	deletedAt: Date | null = null;
}
