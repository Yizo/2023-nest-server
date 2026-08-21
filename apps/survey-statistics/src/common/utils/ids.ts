import { v7 as uuidv7 } from "uuid";

// UUIDv7 按时间大致有序，适合作为主键和分页标记的第二排序字段。
export function newId(): string {
  return uuidv7();
}
