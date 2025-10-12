// ===== role.service.ts =====
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { UserRole } from './user_roles.entity';
import { Log } from './logs.entity';

/**
 * RoleService
 *
 * 责任：
 * - 角色的 CRUD（创建、查询、更新、软删除、恢复）
 * - 为 user_roles 提供辅助操作（但真正分配/移除用户角色由 UserService 操作，以便统一记录日志）
 *
 * 查询器注释：
 * - findRoles 支持分页、排序、模糊查询
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * findRoles - 查询角色列表（分页/排序/模糊）
   *
   * @param options { page?, pageSize?, sortBy?, sortDir?, keyword? }
   * @returns {Promise<{ rows: Role[]; total: number }>}
   */
  async findRoles(options: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
    keyword?: string;
  }): Promise<{ rows: Role[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'id',
      sortDir = 'DESC',
      keyword,
    } = options;
    const qb = this.roleRepo
      .createQueryBuilder('r')
      .where('r.deleted_at IS NULL');
    if (keyword)
      qb.andWhere('(r.code LIKE :kw OR r.name LIKE :kw)', {
        kw: `%${keyword}%`,
      });
    qb.orderBy(`r.${sortBy}`, sortDir as any)
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  /**
   * createRole - 创建角色（code 唯一性校验）
   *
   * @param payload { code: string, name: string, description?: string }
   * @param actorId { number|null }
   * @returns {Promise<Role>}
   */
  async createRole(
    payload: { code: string; name: string; description?: string },
    actorId: number | null = null,
  ): Promise<Role> {
    const { code, name, description } = payload;
    if (!code || !name)
      throw new BadRequestException('code and name are required');

    return await this.dataSource.transaction(async (manager) => {
      const ex = await manager
        .getRepository(Role)
        .createQueryBuilder('r')
        .where('r.code = :code', { code })
        .andWhere('r.deleted_at IS NULL')
        .getOne();
      if (ex) throw new ConflictException('role code exists');

      const created = await manager.getRepository(Role).save({
        code,
        name,
        description: description ?? null,
        deleted_at: null,
      } as Partial<Role>);

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'roles',
        target_id: String(created.id),
        action: 'CREATE',
        message: `Created role ${code}`,
      } as Partial<Log>);

      return created;
    });
  }

  /**
   * updateRole - 更新角色（含唯一性校验）
   *
   * @param roleId {number}
   * @param payload { code?, name?, description? }
   * @param actorId {number|null}
   * @returns {Promise<Role>}
   */
  async updateRole(
    roleId: number,
    payload: { code?: string; name?: string; description?: string },
    actorId: number | null = null,
  ): Promise<Role> {
    return await this.dataSource.transaction(async (manager) => {
      const role = await manager
        .getRepository(Role)
        .createQueryBuilder('r')
        .where('r.id = :id', { id: roleId })
        .andWhere('r.deleted_at IS NULL')
        .getOne();
      if (!role) throw new NotFoundException('role not found');

      if (payload.code && payload.code !== role.code) {
        const ex = await manager
          .getRepository(Role)
          .createQueryBuilder('r')
          .where('r.code = :code', { code: payload.code })
          .andWhere('r.id != :id', { id: roleId })
          .andWhere('r.deleted_at IS NULL')
          .getOne();
        if (ex) throw new ConflictException('role code exists');
      }

      const toUpdate: Partial<Role> = {
        code: payload.code ?? role.code,
        name: payload.name ?? role.name,
        description:
          typeof payload.description !== 'undefined'
            ? payload.description
            : role.description,
        updated_at: new Date(),
      };
      await manager.getRepository(Role).update({ id: roleId }, toUpdate);

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'roles',
        target_id: String(roleId),
        action: 'UPDATE',
        message: `Updated role ${roleId}`,
      } as Partial<Log>);

      return (await manager
        .getRepository(Role)
        .findOneBy({ id: roleId })) as Role;
    });
  }

  /**
   * softDeleteRole - 软删除角色（并软删除 user_roles 中对应的关联）
   *
   * @param roleId {number}
   * @param actorId {number|null}
   */
  async softDeleteRole(
    roleId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const role = await manager
        .getRepository(Role)
        .createQueryBuilder('r')
        .where('r.id = :id', { id: roleId })
        .andWhere('r.deleted_at IS NULL')
        .getOne();
      if (!role) throw new NotFoundException('role not found');

      const now = new Date();
      await manager
        .getRepository(Role)
        .update({ id: roleId }, { deleted_at: now, updated_at: now });

      // 软删除关联
      await manager
        .getRepository(UserRole)
        .createQueryBuilder()
        .update()
        .set({ deleted_at: now })
        .where('role_id = :roleId', { roleId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'roles',
        target_id: String(roleId),
        action: 'SOFT_DELETE',
        message: `Soft deleted role ${role.code}`,
      } as Partial<Log>);
    });
  }

  /**
   * restoreRole - 恢复角色（并恢复 user_roles）
   *
   * @param roleId {number}
   * @param actorId {number|null}
   */
  async restoreRole(
    roleId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const role = await manager
        .getRepository(Role)
        .createQueryBuilder('r')
        .where('r.id = :id', { id: roleId })
        .andWhere('r.deleted_at IS NOT NULL')
        .getOne();
      if (!role) throw new NotFoundException('role not found or not deleted');

      await manager
        .getRepository(Role)
        .update({ id: roleId }, { deleted_at: null, updated_at: new Date() });

      await manager
        .getRepository(UserRole)
        .createQueryBuilder()
        .update()
        .set({ deleted_at: null })
        .where('role_id = :roleId', { roleId })
        .andWhere('deleted_at IS NOT NULL')
        .execute();

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'roles',
        target_id: String(roleId),
        action: 'RESTORE',
        message: `Restored role ${role.code}`,
      } as Partial<Log>);
    });
  }
}
