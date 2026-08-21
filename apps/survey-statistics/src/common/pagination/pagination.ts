import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PageQueryDto {
  @ApiPropertyOptional({ description: "页码，从 1 开始", example: 1, minimum: 1, type: Number })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: "页码必须是整数" })
  @Min(1, { message: "页码不能小于 1" })
  // page/pageSize 由 ValidationPipe + transform 自动从 URL 字符串转成 number。
  page = 1;

  @ApiPropertyOptional({ description: "每页数量，最大 100", example: 20, minimum: 1, maximum: 100, type: Number })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: "每页数量必须是整数" })
  @Min(1, { message: "每页数量不能小于 1" })
  @Max(100, { message: "每页数量不能超过 100" })
  pageSize = 20;
}

export class CursorQueryDto {
  @ApiPropertyOptional({ description: "游标分页标记，首页不传；下一页使用上次响应的 nextCursor" })
  @IsOptional()
  @IsString({ message: "分页标记必须是字符串" })
  cursor?: string;

  @ApiPropertyOptional({ description: "每页数量，最大 100", example: 20, minimum: 1, maximum: 100, type: Number })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: "每页数量必须是整数" })
  @Min(1, { message: "每页数量不能小于 1" })
  @Max(100, { message: "每页数量不能超过 100" })
  pageSize = 20;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CursorResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function encodeCursor(createdAt: Date, id: string): string {
  // 下一页标记携带排序字段，而不是携带页码；插入新数据不会让下一页发生偏移。
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id]), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const [date, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as [string, string];
    const createdAt = new Date(date);
    if (!id || Number.isNaN(createdAt.getTime())) throw new Error("invalid cursor");
    return { createdAt, id };
  } catch {
    throw new Error("invalid cursor");
  }
}
