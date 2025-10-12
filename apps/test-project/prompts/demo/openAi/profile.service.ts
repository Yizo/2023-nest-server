// ===== profile.service.ts =====
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './profile.entity';
import { User } from './user.entity';
import { Log } from './logs.entity';

/**
 * ProfileService
 *
 * 责任：
 * - Profile 的创建/更新/软删除/恢复逻辑
 * - 在执行之前进行用户存在性验证（user 必须存在且未被软删除）
 * - 写操作均记录日志
 *
 * 查询器注释：
 * - findProfiles 支持分页、排序、条件、模糊查询（例如按 real_name 或 phone 模糊）
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * findProfiles - 查询 profile 列表
   *
   * @param options {object} 支持 page,pageSize,sortBy,sortDir,filters:{user_id,real_name},keyword
   * @returns {Promise<{ rows: Profile[]; total: number }>}
   */
  async findProfiles(options: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
    filters?: { user_id?: number; real_name?: string };
    keyword?: string;
  }): Promise<{ rows: Profile[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'id',
      sortDir = 'DESC',
      filters = {},
      keyword,
    } = options;
    const qb = this.profileRepo
      .createQueryBuilder('p')
      .where('p.deleted_at IS NULL');

    if (filters.user_id)
      qb.andWhere('p.user_id = :user_id', { user_id: filters.user_id });
    if (filters.real_name)
      qb.andWhere('p.real_name = :real_name', { real_name: filters.real_name });
    if (keyword)
      qb.andWhere('(p.real_name LIKE :kw OR p.phone LIKE :kw)', {
        kw: `%${keyword}%`,
      });

    qb.orderBy(`p.${sortBy}`, sortDir as any)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  /**
   * createProfile - 创建 profile（强制校验 user 存在）
   *
   * @param payload { user_id:number, real_name?, phone?, avatar_url?, meta? }
   * @param actorId {number|null} 发起人（日志）
   *
   * @returns {Promise<Profile>}
   */
  async createProfile(
    payload: {
      user_id: number;
      real_name?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
      meta?: any | null;
    },
    actorId: number | null = null,
  ): Promise<Profile> {
    const { user_id } = payload;
    if (!user_id) throw new BadRequestException('user_id required');

    return await this.dataSource.transaction(async (manager) => {
      // 存在性校验：user
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: user_id })
        .andWhere('u.deleted_at IS NULL')
        .getOne();
      if (!user) throw new NotFoundException('user not found');

      // 冲突检测：一个用户只能有一个未被删除的 profile（如果业务要求）
      const ex = await manager
        .getRepository(Profile)
        .createQueryBuilder('p')
        .where('p.user_id = :user_id', { user_id })
        .andWhere('p.deleted_at IS NULL')
        .getOne();
      if (ex)
        throw new BadRequestException('profile already exists for this user');

      const created = await manager.getRepository(Profile).save({
        user_id,
        real_name: payload.real_name ?? null,
        phone: payload.phone ?? null,
        avatar_url: payload.avatar_url ?? null,
        meta: payload.meta ?? null,
        deleted_at: null,
      } as Partial<Profile>);

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'profiles',
        target_id: String(created.id),
        action: 'CREATE',
        message: `Created profile for user ${user_id}`,
        meta: null,
      } as Partial<Log>);

      return created;
    });
  }

  /**
   * updateProfile - 更新 profile（校验存在性）
   *
   * @param profileId { number }
   * @param payload { real_name?, phone?, avatar_url?, meta? }
   * @param actorId { number|null }
   * @returns {Promise<Profile>}
   */
  async updateProfile(
    profileId: number,
    payload: {
      real_name?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
      meta?: any | null;
    },
    actorId: number | null = null,
  ): Promise<Profile> {
    return await this.dataSource.transaction(async (manager) => {
      const prof = await manager
        .getRepository(Profile)
        .createQueryBuilder('p')
        .where('p.id = :id', { id: profileId })
        .andWhere('p.deleted_at IS NULL')
        .getOne();
      if (!prof) throw new NotFoundException('profile not found');

      const toUpdate: Partial<Profile> = {
        real_name:
          typeof payload.real_name !== 'undefined'
            ? payload.real_name
            : prof.real_name,
        phone:
          typeof payload.phone !== 'undefined' ? payload.phone : prof.phone,
        avatar_url:
          typeof payload.avatar_url !== 'undefined'
            ? payload.avatar_url
            : prof.avatar_url,
        meta: typeof payload.meta !== 'undefined' ? payload.meta : prof.meta,
        updated_at: new Date(),
      };
      await manager.getRepository(Profile).update({ id: profileId }, toUpdate);

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'profiles',
        target_id: String(profileId),
        action: 'UPDATE',
        message: `Updated profile ${profileId}`,
        meta: null,
      } as Partial<Log>);

      return (await manager
        .getRepository(Profile)
        .findOneBy({ id: profileId })) as Profile;
    });
  }

  /**
   * softDeleteProfile - 软删除 profile
   *
   * @param profileId { number }
   * @param actorId { number|null }
   */
  async softDeleteProfile(
    profileId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const prof = await manager
        .getRepository(Profile)
        .createQueryBuilder('p')
        .where('p.id = :id', { id: profileId })
        .andWhere('p.deleted_at IS NULL')
        .getOne();
      if (!prof) throw new NotFoundException('profile not found');

      await manager
        .getRepository(Profile)
        .update(
          { id: profileId },
          { deleted_at: new Date(), updated_at: new Date() },
        );

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'profiles',
        target_id: String(profileId),
        action: 'SOFT_DELETE',
        message: `Soft deleted profile ${profileId}`,
      } as Partial<Log>);
    });
  }

  /**
   * restoreProfile - 恢复 profile
   *
   * @param profileId { number }
   * @param actorId { number|null }
   */
  async restoreProfile(
    profileId: number,
    actorId: number | null = null,
  ): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const prof = await manager
        .getRepository(Profile)
        .createQueryBuilder('p')
        .where('p.id = :id', { id: profileId })
        .andWhere('p.deleted_at IS NOT NULL')
        .getOne();
      if (!prof)
        throw new NotFoundException('profile not found or not deleted');

      await manager
        .getRepository(Profile)
        .update(
          { id: profileId },
          { deleted_at: null, updated_at: new Date() },
        );

      await manager.getRepository(Log).save({
        user_id: actorId,
        target_table: 'profiles',
        target_id: String(profileId),
        action: 'RESTORE',
        message: `Restored profile ${profileId}`,
      } as Partial<Log>);
    });
  }
}
