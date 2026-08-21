import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { PageResult } from "@/common/pagination/pagination";
import type { RoleListQueryDto, UserListQueryDto } from "./identity.dto";

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  status: string;
  isPlatformOwner: boolean;
  createdAt: Date;
}

@Injectable()
export class IdentityQueries {
  constructor(private readonly em: EntityManager) {}

  async listUsers(query: UserListQueryDto): Promise<PageResult<UserListItem>> {
    // 列表查询与写入 Service 分开，分页、搜索等读模型不会污染事务业务逻辑。
    const conditions = [`deleted_at is null`];
    const params: unknown[] = [];
    if (query.status) {
      params.push(query.status);
      conditions.push("status = ?");
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      params.push(pattern, pattern);
      params.push(pattern);
      conditions.push("(username ilike ? or email ilike ? or display_name ilike ?)");
    }
    const where = conditions.join(" and ");
    const offset = (query.page - 1) * query.pageSize;
    const connection = this.em.getConnection();
    const countRows = await connection.execute<{ total: string }[]>(
      `select count(*)::text as total from users where ${where}`,
      params,
    );
    const itemParams = [...params, query.pageSize, offset];
    const items = await connection.execute<Array<{
      id: string; username: string; email: string; display_name: string; status: string; is_platform_owner: boolean; created_at: Date;
    }>>(
      `select id, username, email, display_name, status, is_platform_owner, created_at
       from users where ${where}
       order by created_at desc, id desc
       limit ? offset ?`,
      itemParams,
    );
    return {
      items: items.map((item) => ({
        id: item.id,
        username: item.username,
        email: item.email,
        displayName: item.display_name,
        status: item.status,
        isPlatformOwner: item.is_platform_owner,
        createdAt: item.created_at,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async listRoles(query: RoleListQueryDto): Promise<PageResult<Record<string, unknown>>> {
    const conditions = ["deleted_at is null"];
    const params: unknown[] = [];
    for (const [column, value] of [
      ["name", query.name],
      ["code", query.code],
      ["description", query.description],
    ] as const) {
      if (value) {
        conditions.push(`${column} ilike ?`);
        params.push(`%${value}%`);
      }
    }
    if (query.enabled !== undefined) {
      conditions.push("enabled = ?");
      params.push(query.enabled);
    }
    const where = conditions.join(" and ");
    const connection = this.em.getConnection();
    const countRows = await connection.execute<Array<{ total: string }>>(
      `select count(*)::text as total from roles where ${where}`,
      params,
    );
    const items = await connection.execute<Array<Record<string, unknown>>>(
      `select id, code, name, description, enabled,
              created_at as "createdAt", updated_at as "updatedAt"
       from roles where ${where}
       order by updated_at desc, id desc limit ? offset ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
