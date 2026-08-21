import type { Opt } from "@mikro-orm/core";
import { PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { newId } from "@/common/utils/ids";

export abstract class BaseEntity {
  // 所有关联表都使用 UUIDv7：包含时间排序信息，又不会暴露自增 ID 数量。
  @PrimaryKey({ type: "uuid" })
  id: string = newId();

  @Property({ fieldName: "created_at", type: "timestamptz" })
  createdAt: Opt<Date> = new Date();

  @Property({ fieldName: "updated_at", type: "timestamptz", onUpdate: () => new Date() })
  updatedAt: Opt<Date> = new Date();
}

export abstract class SoftDeleteEntity extends BaseEntity {
  // 业务数据默认软删除，便于审计和避免历史关联突然失效。
  @Property({ fieldName: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null = null;
}
