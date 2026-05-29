export const MONITOR_EVENT_TYPES = [
	"runtime-error",
	"promise-error",
	"resource-error",
	"request-error",
	"vue-error",
	"react-error",
	"sdk-error",
	"caught-error",
	"manual-error",
] as const;

export type MonitorEventType = (typeof MONITOR_EVENT_TYPES)[number];
