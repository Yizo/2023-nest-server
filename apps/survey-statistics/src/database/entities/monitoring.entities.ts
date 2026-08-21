import type { Opt } from "@mikro-orm/core";
import { Entity, Index, Property, Unique } from "@mikro-orm/decorators/legacy";
import { BaseEntity, SoftDeleteEntity } from "@/database/base.entity";

/** 监控应用保存凭据哈希，客户端错误保存原始记录和聚合结果。 */
@Entity({ tableName: "monitor_apps" })
@Unique({ name: "uq_monitor_apps_code", properties: ["code"] })
export class MonitorApp extends SoftDeleteEntity {
  @Property({ length: 80 })
  code!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ fieldName: "ingest_key_hash", length: 255, hidden: true })
  ingestKeyHash!: string;

  @Property()
  enabled: Opt<boolean> = true;
}

@Entity({ tableName: "client_errors" })
@Unique({ name: "uq_client_errors_event", properties: ["appId", "eventId"] })
@Index({ name: "idx_client_errors_app_created", properties: ["appId", "createdAt"] })
@Index({ name: "idx_client_errors_fingerprint", properties: ["appId", "fingerprint"] })
@Index({ name: "idx_client_errors_unprocessed", properties: ["processedAt"] })
export class ClientError extends BaseEntity {
  // processedAt 为 null 表示还没有完成聚合，是补偿任务判断待处理记录的依据。
  @Property({ fieldName: "app_id", type: "uuid" })
  appId!: string;

  @Property({ fieldName: "event_id", length: 100 })
  eventId!: string;

  @Property({ fieldName: "user_id", type: "uuid", nullable: true })
  userId: string | null = null;

  @Property({ length: 64 })
  fingerprint!: string;

  @Property({ type: "text" })
  message!: string;

  @Property({ type: "text", nullable: true })
  stack: string | null = null;

  @Property({ type: "jsonb" })
  context: Opt<Record<string, unknown>> = {};

  @Property({ fieldName: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Property({ fieldName: "processed_at", type: "timestamptz", nullable: true })
  processedAt: Date | null = null;
}

@Entity({ tableName: "client_error_groups" })
@Unique({ name: "uq_client_error_groups_fingerprint", properties: ["appId", "fingerprint"] })
@Index({ name: "idx_client_error_groups_last_seen", properties: ["appId", "lastSeenAt"] })
export class ClientErrorGroup extends BaseEntity {
  // 同一个 app + fingerprint 只有一个分组，count 在聚合任务中递增。
  @Property({ fieldName: "app_id", type: "uuid" })
  appId!: string;

  @Property({ length: 64 })
  fingerprint!: string;

  @Property({ fieldName: "sample_message", type: "text" })
  sampleMessage!: string;

  @Property()
  count: Opt<number> = 0;

  @Property({ fieldName: "first_seen_at", type: "timestamptz" })
  firstSeenAt!: Date;

  @Property({ fieldName: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;
}

@Entity({ tableName: "notifications" })
@Index({ name: "idx_notifications_created", properties: ["createdAt"] })
export class Notification extends BaseEntity {
  @Property({ length: 80 })
  type!: string;

  @Property({ length: 200 })
  title!: string;

  @Property({ type: "text" })
  content!: string;

  @Property({ type: "jsonb" })
  payload: Opt<Record<string, unknown>> = {};
}

@Entity({ tableName: "notification_recipients" })
@Unique({ name: "uq_notification_recipients_pair", properties: ["notificationId", "userId"] })
@Index({ name: "idx_notification_recipients_user_created", properties: ["userId", "createdAt"] })
@Index({ name: "idx_notification_recipients_pending", properties: ["deliveryStatus", "createdAt"] })
export class NotificationRecipient extends BaseEntity {
  @Property({ fieldName: "notification_id", type: "uuid" })
  notificationId!: string;

  @Property({ fieldName: "user_id", type: "uuid" })
  userId!: string;

  @Property({ fieldName: "delivery_status", length: 20 })
  deliveryStatus: Opt<"pending" | "sent"> = "pending";

  @Property({ fieldName: "delivered_at", type: "timestamptz", nullable: true })
  deliveredAt: Date | null = null;

  @Property({ fieldName: "read_at", type: "timestamptz", nullable: true })
  readAt: Date | null = null;
}
