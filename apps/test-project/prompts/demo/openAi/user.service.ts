// ===== user.service.ts =====
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';
import { UserRole } from './user_roles.entity';
import { Log } from './logs.entity';
import { Role } from './role.entity';

/**
 * UserService
 *
 * 责任：
 * - 用户 CRUD（创建、查询、更新、软删除、恢复）
 * - 维护与 Profile、UserRole、Logs 的手动一致性（使用事务）
 * - 提供复杂查询（排序、分页、条件、模糊、多表 JOIN）
 *
 * 重要：所有写操作必须写入 logs 表记录。
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    private readonly dataSource: DataSource,
  ) {}

  // ------------------ 查询器说明 ------------------
  /**
   * QueryBuilder 说明（findUsers 对应的查询器）
   *
   * 作用：
   * - 支持动态组合：分页、排序、条件过滤（精确/模糊）、多表 JOIN（profiles, user_roles -> roles）
   * - 返回带总数的结果（rows, total）
   *
   * 使用场景：
   * - 列表页：可根据 query 参数自由组合查询。
   *
   * 优化思路：
   * - 根据是否需要关联字段决定是否 LEFT JOIN profiles 或 user_roles，以减少不必要的 JOIN。
   * - 对分页使用 LIMIT OFFSET；若数据特别大可改用 keyset pagination（不在此基础实现中）。
   */

  /**
   * findUsers - 查询用户列表（支持分页、排序、条件、模糊、可选 JOIN）
   *
   * @param options {object} 查询选项
   *  - page?: number (默认 1)
   *  - pageSize?: number (默认 20)
   *  - sortBy?: string (如 'created_at' 或 'username')
   *  - sortDir?: 'ASC'|'DESC'
   *  - filters?: { username?: string, email?: string, is_active?: boolean } 精确匹配
   *  - keyword?: string 全局模糊匹配 username/display_name/email
   *  - includeProfile?: boolean 是否 LEFT JOIN profiles（以获取 profile 字段）
   *  - includeRoles?: boolean 是否 LEFT JOIN roles（通过 user_roles 中间表）
   *
   * @returns {Promise<{ rows: any[]; total: number }>}
   */
  async findUsers(options: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
    filters?: { username?: string; email?: string; is_active?: boolean };
    keyword?: string;
    includeProfile?: boolean;
    includeRoles?: boolean;
  }): Promise<{ rows: any[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'id',
      sortDir = 'DESC',
      filters = {},
      keyword,
      includeProfile = false,
      includeRoles = false,
    } = options;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL');

    // 精确条件
    if (filters.username)
      qb.andWhere('u.username = :username', { username: filters.username });
    if (filters.email)
      qb.andWhere('u.email = :email', { email: filters.email });
    if (typeof filters.is_active === 'boolean')
      qb.andWhere('u.is_active = :is_active', { is_active: filters.is_active });

    // 模糊查询（keyword）
    if (keyword) {
      qb.andWhere(
        '(u.username LIKE :kw OR u.display_name LIKE :kw OR u.email LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    // 可选 JOIN profiles
    if (includeProfile) {
      qb.leftJoinAndSelect(
        'profiles',
        'p',
        'p.user_id = u.id AND p.deleted_at IS NULL',
      );
      // 注意：由于我们未使用实体关系，所以使用 raw join 写法（TypeORM 支持 raw join table name）
    }

    // 可选 JOIN roles（通过 user_roles 中间表）
    if (includeRoles) {
      qb.leftJoin(
        'user_roles',
        'ur',
        'ur.user_id = u.id AND ur.deleted_at IS NULL',
      )
        .leftJoin('roles', 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
        .addSelect(['r.id', 'r.code', 'r.name']);
      // 这里 roles 字段需要在返回结果中手动整理
    }

    // 排序
    qb.orderBy(`u.${sortBy}`, sortDir as 'ASC' | 'DESC');

    // 分页
    qb.skip((page - 1) * pageSize).take(pageSize);

    // 执行两个查询：数据与总数
    const [rows, total] = await qb.getManyAndCount();

    // 如果 includeRoles 为 true，需要额外查询角色并合并（因为 getManyAndCount 可能没把 role 字段合并为数组）
    if (includeRoles) {
      // 获取 user ids
      const userIds = (rows as User[]).map((u) => u.id);
      if (userIds.length > 0) {
        const rolesQb = this.dataSource
          .createQueryBuilder()
          .select([
            'ur.user_id as user_id',
            'r.id as role_id',
            'r.code as code',
            'r.name as name',
          ])
          .from('user_roles', 'ur')
          .innerJoin('roles', 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
          .where('ur.user_id IN (:...userIds)', { userIds })
          .andWhere('ur.deleted_at IS NULL');

        const roleRows: Array<{
          user_id: number;
          role_id: number;
          code: string;
          name: string;
        }> = await rolesQb.execute();
        // 合并到 rows
        const map = new Map<number, any[]>();
        for (const rr of roleRows) {
          if (!map.has(rr.user_id)) map.set(rr.user_id, []);
          map
            .get(rr.user_id)
            .push({ id: rr.role_id, code: rr.code, name: rr.name });
        }
        // @ts-ignore
        for (const u of rows) {
          // @ts-ignore
          u.roles = map.get(u.id) || [];
        }
      }
    }

    return { rows, total };
  }

  /**
   * createUser - 创建用户（并可选创建 profile）
   *
   * 事务逻辑：
   * - 检查 username/email 唯一性（冲突检测）
   * - 插入 users
   * - 如 options.profile 提供，则校验并插入 profiles（profile.user_id = user.id）
   * - 记录 logs 表
   *
   * @param payload {object} 创建负载
   *  - username: string (required)
   *  - password_hash: string (required)
   *  - email?: string
   *  - display_name?: string
   *  - profile?: { real_name?: string, phone?: string, avatar_url?: string, meta?: any }
   *  - actorId?: number 发起此操作的用户 id（记录日志用）
   *
   * @returns {Promise<User>} 新创建的用户实体（不包含密码）
   */
  async createUser(payload: {
    username: string;
    password_hash: string;
    email?: string | null;
    display_name?: string | null;
    profile?: {
      real_name?: string;
      phone?: string;
      avatar_url?: string;
      meta?: any;
    };
    actorId?: number | null;
  }): Promise<User> {
    const {
      username,
      email,
      password_hash,
      display_name,
      profile,
      actorId = null,
    } = payload;

    // 基本合法性校验
    if (!username || !password_hash)
      throw new BadRequestException('username and password_hash are required');

    // 事务内操作
    return await this.dataSource.transaction(async (manager) => {
      // 唯一性检查 - username
      const existing = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.username = :username', { username })
        .andWhere('u.deleted_at IS NULL')
        .getOne();

      if (existing) throw new ConflictException('username already exists');

      // 若 email 提供，检查 email 唯一性
      if (email) {
        const ex2 = await manager
          .getRepository(User)
          .createQueryBuilder('u')
          .where('u.email = :email', { email })
          .andWhere('u.deleted_at IS NULL')
          .getOne();
        if (ex2) throw new ConflictException('email already exists');
      }

      // 插入用户
      const insertResult = await manager.getRepository(User).save({
        username,
        email: email ?? null,
        password_hash,
        display_name: display_name ?? null,
        is_active: true,
        deleted_at: null,
      } as Partial<User>);

      // 如果提供 profile，则插入 profile（并校验 user 存在）
      if (profile) {
        // existence check: user exists and not deleted (we just created it)
        await manager.getRepository(Profile).save({
          user_id: insertResult.id,
          real_name: profile.real_name ?? null,
          phone: profile.phone ?? null,
          avatar_url: profile.avatar_url ?? null,
          meta: profile.meta ?? null,
          deleted_at: null,
        } as Partial<Profile>);
      }

      // 写日志
      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'users',
        target_id: String(insertResult.id),
        action: 'CREATE',
        message: `Created user ${insertResult.username}`,
        meta: { profileCreated: !!profile },
      } as Partial<Log>);

      // 清理敏感字段（如 password_hash）再返回
      // @ts-ignore
      delete insertResult.password_hash;
      return insertResult;
    });
  }

  /**
   * updateUser - 更新用户信息（同步更新 profile、写日志）
   *
   * 事务逻辑：
   * - 检查用户存在性（未被软删除）
   * - 检查字段冲突（如 email 唯一性）
   * - 更新 users 表
   * - 若 payload.profile 存在，更新 profile（或创建）
   * - 写入日志
   *
   * @param userId {number} 要更新的用户 id
   * @param payload {object} 更新负载（可包含 password_hash, email, display_name, is_active, profile）
   * @param actorId {number|null} 发起人 id（日志）
   *
   * @returns {Promise<User>} 更新后的用户（敏感字段已删除）
   */
  async updateUser(
    userId: number,
    payload: {
      password_hash?: string;
      email?: string | null;
      display_name?: string | null;
      is_active?: boolean;
      profile?: {
        real_name?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        meta?: any;
      };
    },
    actorId: number | null = null,
  ): Promise<User> {
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(Profile);
      const logRepo = manager.getRepository(Log);

      const user = await userRepo
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .andWhere('u.deleted_at IS NULL')
        .getOne();

      if (!user) throw new NotFoundException('user not found');

      // email 冲突检测
      if (typeof payload.email !== 'undefined' && payload.email !== null) {
        const ex = await userRepo
          .createQueryBuilder('u')
          .where('u.email = :email', { email: payload.email })
          .andWhere('u.id != :id', { id: userId })
          .andWhere('u.deleted_at IS NULL')
          .getOne();
        if (ex)
          throw new ConflictException('email already in use by other user');
      }

      // 准备更新字段
      const toUpdate: Partial<User> = {};
      if (typeof payload.password_hash !== 'undefined')
        toUpdate.password_hash = payload.password_hash;
      if (typeof payload.email !== 'undefined') toUpdate.email = payload.email;
      if (typeof payload.display_name !== 'undefined')
        toUpdate.display_name = payload.display_name;
      if (typeof payload.is_active !== 'undefined')
        toUpdate.is_active = payload.is_active;
      toUpdate.updated_at = new Date();

      await userRepo.update({ id: userId }, toUpdate);

      // 同步更新 profile（若提供）
      if (payload.profile) {
        // 检查 profile 是否存在（并未被软删除）
        const prof = await profileRepo
          .createQueryBuilder('p')
          .where('p.user_id = :userId', { userId })
          .andWhere('p.deleted_at IS NULL')
          .getOne();

        if (prof) {
          // update
          const profileToUpdate: Partial<Profile> = {
            real_name: payload.profile.real_name ?? prof.real_name,
            phone:
              typeof payload.profile.phone !== 'undefined'
                ? payload.profile.phone
                : prof.phone,
            avatar_url:
              typeof payload.profile.avatar_url !== 'undefined'
                ? payload.profile.avatar_url
                : prof.avatar_url,
            meta:
              typeof payload.profile.meta !== 'undefined'
                ? payload.profile.meta
                : prof.meta,
            updated_at: new Date(),
          };
          await profileRepo.update({ id: prof.id }, profileToUpdate);
        } else {
          // create new profile
          await profileRepo.save({
            user_id: userId,
            real_name: payload.profile.real_name ?? null,
            phone: payload.profile.phone ?? null,
            avatar_url: payload.profile.avatar_url ?? null,
            meta: payload.profile.meta ?? null,
            deleted_at: null,
          } as Partial<Profile>);
        }
      }

      // 写日志
      await logRepo.save({
        user_id: actorId,
        target_table: 'users',
        target_id: String(userId),
        action: 'UPDATE',
        message: `Updated user ${user.username}`,
        meta: { payload },
      } as Partial<Log>);

      // 返回更新后的用户（不含 password_hash）
      const updated = await userRepo
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .getOne();
      // @ts-ignore
      if (updated) delete updated.password_hash;
      return updated as User;
    });
  }

  /**
   * softDeleteUser - 软删除用户（手动级联软删 profile & user_roles & logs 记录）
   *
   * 事务逻辑：
   * - 校验用户存在且未被删除
   * - 设置 users.deleted_at
   * - 设置 profiles.deleted_at（若存在）
   * - 设置 user_roles.deleted_at（若存在）
   * - 在 logs 表写入一条 SOFT_DELETE 操作
   *
   * @param userId {number} 要软删除的用户 id
   * @param actorId {number|null} 发起者 id（日志）
   *
   * @returns {Promise<void>}
   */
  async softDeleteUser(
    userId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const now = new Date();

      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .andWhere('u.deleted_at IS NULL')
        .getOne();

      if (!user) throw new NotFoundException('user not found');

      // 标记 users.deleted_at
      await manager
        .getRepository(User)
        .update({ id: userId }, { deleted_at: now, updated_at: now });

      // 级联软删除 profile（如果存在）
      await manager
        .getRepository(Profile)
        .createQueryBuilder()
        .update()
        .set({ deleted_at: now, updated_at: now })
        .where('user_id = :userId', { userId })
        .andWhere('deleted_at IS NULL')
        .execute();

      // 级联软删除 user_roles（逻辑删除关联）
      await manager
        .getRepository(UserRole)
        .createQueryBuilder()
        .update()
        .set({ deleted_at: now })
        .where('user_id = :userId', { userId })
        .andWhere('deleted_at IS NULL')
        .execute();

      // 写入日志
      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'users',
        target_id: String(userId),
        action: 'SOFT_DELETE',
        message: `Soft deleted user ${user.username}`,
        meta: null,
      } as Partial<Log>);
    });
  }

  /**
   * restoreUser - 恢复被软删除的用户（并同步恢复 profile 与 user_roles）
   *
   * 事务逻辑：
   * - 校验用户存在且已被软删除
   * - 清除 users.deleted_at
   * - 清除 profiles.deleted_at、user_roles.deleted_at（可选：此处恢复关联）
   * - 写日志
   *
   * @param userId {number}
   * @param actorId {number|null}
   */
  async restoreUser(
    userId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .andWhere('u.deleted_at IS NOT NULL')
        .getOne();

      if (!user) throw new NotFoundException('user not found or not deleted');

      const now = null; // set deleted_at to null to restore
      await manager
        .getRepository(User)
        .update({ id: userId }, { deleted_at: null, updated_at: new Date() });

      // 恢复 profile（如果存在）
      await manager
        .getRepository(Profile)
        .createQueryBuilder()
        .update()
        .set({ deleted_at: null, updated_at: new Date() })
        .where('user_id = :userId', { userId })
        .andWhere('deleted_at IS NOT NULL')
        .execute();

      // 恢复 user_roles（如果存在）
      await manager
        .getRepository(UserRole)
        .createQueryBuilder()
        .update()
        .set({ deleted_at: null })
        .where('user_id = :userId', { userId })
        .andWhere('deleted_at IS NOT NULL')
        .execute();

      // 写日志
      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'users',
        target_id: String(userId),
        action: 'RESTORE',
        message: `Restored user ${user.username}`,
      } as Partial<Log>);
    });
  }

  /**
   * assignRolesToUser - 分配角色给用户（手动维护 user_roles 中间表）
   *
   * 事务逻辑：
   * - 校验用户存在且未删除
   * - 校验每个 roleId 在 roles 表存在且未删除
   * - 对 user_roles 做冲突检测（避免重复），插入新的关联行
   * - 写日志（每次分配）
   *
   * @param userId {number} 用户 id
   * @param roleIds {number[]} 角色 id 列表
   * @param actorId {number|null} 发起者 id
   */
  async assignRolesToUser(
    userId: number,
    roleIds: number[],
    actorId: number | null = null,
  ): Promise<void> {
    if (!Array.isArray(roleIds) || roleIds.length === 0)
      throw new BadRequestException('roleIds required');

    return await this.dataSource.transaction(async (manager) => {
      // 存在性校验：user
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .andWhere('u.deleted_at IS NULL')
        .getOne();
      if (!user) throw new NotFoundException('user not found');

      // 存在性校验：roles
      const roles = await manager
        .getRepository(Role)
        .createQueryBuilder('r')
        .where('r.id IN (:...roleIds)', { roleIds })
        .andWhere('r.deleted_at IS NULL')
        .getMany();
      const foundRoleIds = new Set(roles.map((r) => r.id));
      for (const rid of roleIds) {
        if (!foundRoleIds.has(rid))
          throw new NotFoundException(`role ${rid} not found`);
      }

      // 查找已存在关联
      const existing = await manager
        .getRepository(UserRole)
        .createQueryBuilder('ur')
        .where('ur.user_id = :userId', { userId })
        .andWhere('ur.role_id IN (:...roleIds)', { roleIds })
        .getMany();

      const existingRoleIds = new Set(existing.map((e) => e.role_id));

      // 插入不存在的关联
      for (const rid of roleIds) {
        if (!existingRoleIds.has(rid)) {
          await manager.getRepository(UserRole).save({
            user_id: userId,
            role_id: rid,
            deleted_at: null,
            created_at: new Date(),
          } as Partial<UserRole>);

          // 写日志（每个角色）
          await manager.getRepository(Log).save({
            user_id: actorId,
            target_table: 'user_roles',
            target_id: `${userId}:${rid}`,
            action: 'ASSIGN_ROLE',
            message: `Assigned role ${rid} to user ${user.username}`,
            meta: null,
          } as Partial<Log>);
        } else {
          // 如果存在但是被软删除，则恢复
          const ex = existing.find((e) => e.role_id === rid);
          if (ex && ex.deleted_at) {
            await manager
              .getRepository(UserRole)
              .update({ id: ex.id }, { deleted_at: null });
            await manager.getRepository(Log).save({
              user_id: actorId,
              target_table: 'user_roles',
              target_id: `${userId}:${rid}`,
              action: 'ASSIGN_ROLE_RESTORE',
              message: `Restored assigned role ${rid} to user ${user.username}`,
            } as Partial<Log>);
          }
        }
      }
    });
  }

  /**
   * removeRoleFromUser - 从用户移除角色（手动软删除 user_roles）
   *
   * 事务逻辑：
   * - 校验存在性
   * - 设置 user_roles.deleted_at
   * - 写日志
   *
   * @param userId {number}
   * @param roleId {number}
   * @param actorId {number|null}
   */
  async removeRoleFromUser(
    userId: number,
    roleId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const ur = await manager
        .getRepository(UserRole)
        .createQueryBuilder('ur')
        .where('ur.user_id = :userId', { userId })
        .andWhere('ur.role_id = :roleId', { roleId })
        .andWhere('ur.deleted_at IS NULL')
        .getOne();
      if (!ur) throw new NotFoundException('role assignment not found');

      await manager
        .getRepository(UserRole)
        .update({ id: ur.id }, { deleted_at: new Date() });

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'user_roles',
        target_id: `${userId}:${roleId}`,
        action: 'REMOVE_ROLE',
        message: `Removed role ${roleId} from user ${userId}`,
      } as Partial<Log>);
    });
  }
}
