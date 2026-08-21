import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "@/database/entities";

@Injectable()
export class AuthorizationService {
  constructor(private readonly em: EntityManager) {}

  async hasAllPermissions(userId: string, required: string[]): Promise<boolean> {
    // Controller 可以声明多个权限；这里是“全部满足”而不是“任意满足”。
    if (required.length === 0) return true;
    const user = await this.em.findOne(User, { id: userId, deletedAt: null }, { fields: ["id", "isPlatformOwner", "status"] });
    if (!user || user.status !== "active") return false;
    // 平台所有者只用于首个系统引导，拥有全局管理能力但不是一个动态角色。
    if (user.isPlatformOwner) return true;
    // 复杂的多表读查询使用业务专用 SQL；参数仍交给 MikroORM 绑定，禁止字符串拼接。
    const rows = await this.em.getConnection().execute<Array<{ code: string }>>(
      `select distinct p.code
       from user_roles ur
       join roles r on r.id = ur.role_id and r.deleted_at is null and r.enabled = true
       join role_permissions rp on rp.role_id = r.id
       join permissions p on p.id = rp.permission_id and p.deleted_at is null
       where ur.user_id = ? and p.code in (?)`,
      [userId, required],
    );
    const granted = new Set(rows.map((row) => row.code));
    return required.every((permission) => granted.has(permission));
  }

  async listPermissionCodes(userId: string): Promise<string[]> {
    const user = await this.em.findOne(User, { id: userId, deletedAt: null }, { fields: ["id", "isPlatformOwner"] });
    if (!user) return [];
    if (user.isPlatformOwner) return ["*"];
    const rows = await this.em.getConnection().execute<Array<{ code: string }>>(
      `select distinct p.code
       from user_roles ur
       join roles r on r.id = ur.role_id and r.deleted_at is null and r.enabled = true
       join role_permissions rp on rp.role_id = r.id
       join permissions p on p.id = rp.permission_id and p.deleted_at is null
       where ur.user_id = ? order by p.code`,
      [userId],
    );
    return rows.map((row) => row.code);
  }
}
