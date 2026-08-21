const sensitiveKey = /password|token|authorization|cookie|secret|api[-_]?key/i;

export function sanitizeLogField(key: string, value: unknown): unknown {
  return sensitiveKey.test(key) ? "[REDACTED]" : sanitizeLogValue(value);
}

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/gi, "$1[REDACTED]@");
}

/** 递归清理日志元数据，避免密码、Token 和 Cookie 写入文件。 */
export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[OMITTED]";
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeLogValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : sanitizeLogValue(item, depth + 1)]),
    );
  }
  return value;
}
