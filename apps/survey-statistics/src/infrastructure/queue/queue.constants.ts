// 队列只有一个，任务类型通过 name 区分，避免小型系统过早拆成多个队列。
export const BACKGROUND_QUEUE = "background";

export const JOB_NAMES = {
  notificationDispatch: "notification.dispatch",
  monitorErrorAggregate: "monitor.error.aggregate",
  retentionCleanup: "maintenance.retention.cleanup",
  reconcile: "maintenance.reconcile",
  integrityAudit: "maintenance.integrity.audit",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
