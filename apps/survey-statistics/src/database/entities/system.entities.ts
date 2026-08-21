import type { Opt } from "@mikro-orm/core";
import { Entity, Index, Property, Unique } from "@mikro-orm/decorators/legacy";
import { BaseEntity, SoftDeleteEntity } from "@/database/base.entity";

/** 系统元数据实体：字典、菜单、系统配置。 */
@Entity({ tableName: "dict_types" })
@Unique({ name: "uq_dict_types_code", properties: ["code"] })
export class DictionaryType extends SoftDeleteEntity {
  @Property({ length: 80 })
  code!: string;

  @Property({ length: 100 })
  name!: string;

  @Property()
  enabled: Opt<boolean> = true;
}

@Entity({ tableName: "dict_items" })
@Unique({ name: "uq_dict_items_type_value", properties: ["dictTypeId", "value"] })
@Index({ name: "idx_dict_items_type_sort", properties: ["dictTypeId", "sortOrder"] })
export class DictionaryItem extends SoftDeleteEntity {
  @Property({ fieldName: "dict_type_id", type: "uuid" })
  dictTypeId!: string;

  @Property({ length: 100 })
  label!: string;

  @Property({ length: 100 })
  value!: string;

  @Property({ fieldName: "sort_order" })
  sortOrder: Opt<number> = 0;

  @Property()
  enabled: Opt<boolean> = true;
}

@Entity({ tableName: "menus" })
@Index({ name: "idx_menus_parent_sort", properties: ["parentId", "sortOrder"] })
export class Menu extends SoftDeleteEntity {
  // parentId 支持树形菜单；创建和更新时禁止自引用并检查父节点存在。
  @Property({ fieldName: "parent_id", type: "uuid", nullable: true })
  parentId: string | null = null;

  @Property({ fieldName: "permission_id", type: "uuid", nullable: true })
  permissionId: string | null = null;

  @Property({ length: 100 })
  name!: string;

  @Property({ length: 200 })
  path!: string;

  @Property({ fieldName: "sort_order" })
  sortOrder: Opt<number> = 0;

  @Property()
  enabled: Opt<boolean> = true;
}

@Entity({ tableName: "system_configs" })
@Unique({ name: "uq_system_configs_key", properties: ["key"] })
export class SystemConfig extends SoftDeleteEntity {
  // value 统一存字符串，valueType 负责告诉读取方如何解释它。
  @Property({ length: 120 })
  key!: string;

  @Property({ type: "text" })
  value!: string;

  @Property({ length: 20 })
  valueType: Opt<"string" | "number" | "boolean" | "json"> = "string";

  @Property({ type: "string", length: 500, nullable: true })
  description: string | null = null;
}
