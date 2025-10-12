// ===== User Service =====
// src/modules/user/services/user.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, Not, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Profile } from '../../profile/entities/profile.entity';
import { Log } from '../../logs/entities/log.entity';
import { UserRole } from '../../role/entities/user-role.entity';

/**
 * 用户核心服务
 * 负责用户相关的业务逻辑处理和数据操作
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    private dataSource: DataSource,
  ) {}

  /**
   * 创建新用户
   * @param userData 用户数据对象
   * @param profileData 用户资料数据对象
   * @param operatorId 操作者用户ID，用于记录日志
   * @returns 新创建的用户对象
   */
  async createUser(
    userData: Partial<User>,
    profileData: Partial<Profile>,
    operatorId: number,
  ): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 校验用户名和邮箱唯一性
      await this.checkUserUniqueness(userData.username, userData.email);

      // 创建用户
      const user = this.userRepository.create(userData);
      const savedUser = await queryRunner.manager.save(User, user);

      // 创建用户资料
      const profile = this.profileRepository.create({
        ...profileData,
        user_id: savedUser.id,
      });
      await queryRunner.manager.save(Profile, profile);

      // 记录操作日志
      await this.logUserAction(
        queryRunner,
        operatorId,
        'user',
        'create',
        `创建用户: ${user.username}`,
        savedUser.id,
      );

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 查询用户列表（支持分页、排序、条件查询）
   * @param options 查询选项
   * @param options.page 页码
   * @param options.limit 每页数量
   * @param options.sortBy 排序字段
   * @param options.sortOrder 排序方向
   * @param options.keyword 关键词模糊搜索
   * @param options.status 状态筛选
   * @returns 用户列表和分页信息
   */
  async findUsers(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    keyword?: string;
    status?: number;
  }): Promise<{ users: User[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      keyword,
      status,
    } = options;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deleted_at IS NULL')
      .leftJoinAndSelect(
        Profile,
        'profile',
        'profile.user_id = user.id AND profile.deleted_at IS NULL',
      )
      .select([
        'user.*',
        'profile.full_name',
        'profile.avatar',
        'profile.gender',
      ]);

    // 条件查询
    if (status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 模糊查询
    if (keyword) {
      queryBuilder.andWhere(
        '(user.username LIKE :keyword OR user.email LIKE :keyword OR profile.full_name LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序和分页
    const [users, total] = await Promise.all([
      queryBuilder
        .orderBy(`user.${sortBy}`, sortOrder)
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany(),
      queryBuilder.getCount(),
    ]);

    return { users, total };
  }

  /**
   * 根据ID查询用户详情（包含资料信息）
   * @param id 用户ID
   * @returns 用户详情对象
   */
  async findUserById(id: number): Promise<User & { profile?: Profile }> {
    const user = await this.userRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`用户不存在 (ID: ${id})`);
    }

    const profile = await this.profileRepository.findOne({
      where: { user_id: id, deleted_at: IsNull() },
    });

    return { ...user, profile };
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param userData 用户更新数据
   * @param profileData 资料更新数据
   * @param operatorId 操作者用户ID
   * @returns 更新后的用户对象
   */
  async updateUser(
    id: number,
    userData: Partial<User>,
    profileData: Partial<Profile>,
    operatorId: number,
  ): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证用户存在性
      const user = await this.userRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`用户不存在 (ID: ${id})`);
      }

      // 校验唯一性（排除当前用户）
      if (userData.username || userData.email) {
        await this.checkUserUniqueness(userData.username, userData.email, id);
      }

      // 更新用户信息
      if (Object.keys(userData).length > 0) {
        await queryRunner.manager.update(
          User,
          { id },
          { ...userData, updated_at: new Date() },
        );
      }

      // 更新用户资料
      if (Object.keys(profileData).length > 0) {
        await queryRunner.manager.update(
          Profile,
          { user_id: id, deleted_at: IsNull() },
          { ...profileData, updated_at: new Date() },
        );
      }

      // 记录操作日志
      await this.logUserAction(
        queryRunner,
        operatorId,
        'user',
        'update',
        `更新用户信息: ${user.username}`,
        id,
      );

      await queryRunner.commitTransaction();
      return await this.userRepository.findOne({ where: { id } });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 软删除用户（同步软删除关联资料和日志）
   * @param id 用户ID
   * @param operatorId 操作者用户ID
   * @returns 删除结果
   */
  async softDeleteUser(id: number, operatorId: number): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证用户存在性
      const user = await this.userRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`用户不存在 (ID: ${id})`);
      }

      const now = new Date();

      // 软删除用户
      await queryRunner.manager.update(
        User,
        { id },
        { deleted_at: now, updated_at: now },
      );

      // 软删除用户资料
      await queryRunner.manager.update(
        Profile,
        { user_id: id, deleted_at: IsNull() },
        { deleted_at: now, updated_at: now },
      );

      // 记录操作日志
      await this.logUserAction(
        queryRunner,
        operatorId,
        'user',
        'delete',
        `删除用户: ${user.username}`,
        id,
      );

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 恢复已删除的用户
   * @param id 用户ID
   * @param operatorId 操作者用户ID
   * @returns 恢复后的用户对象
   */
  async restoreUser(id: number, operatorId: number): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证用户存在性（包括已删除的）
      const user = await this.userRepository.findOne({
        where: { id },
        withDeleted: true,
      });
      if (!user) {
        throw new NotFoundException(`用户不存在 (ID: ${id})`);
      }

      if (!user.deleted_at) {
        throw new ConflictException(`用户未被删除 (ID: ${id})`);
      }

      const now = new Date();

      // 恢复用户
      await queryRunner.manager.update(
        User,
        { id },
        { deleted_at: null, updated_at: now },
      );

      // 恢复用户资料
      await queryRunner.manager.update(
        Profile,
        { user_id: id },
        { deleted_at: null, updated_at: now },
      );

      // 记录操作日志
      await this.logUserAction(
        queryRunner,
        operatorId,
        'user',
        'restore',
        `恢复用户: ${user.username}`,
        id,
      );

      await queryRunner.commitTransaction();
      return await this.userRepository.findOne({ where: { id } });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 校验用户名和邮箱唯一性
   * @param username 用户名
   * @param email 邮箱
   * @param excludeUserId 排除的用户ID（用于更新操作）
   */
  private async checkUserUniqueness(
    username?: string,
    email?: string,
    excludeUserId?: number,
  ): Promise<void> {
    if (username) {
      const whereCondition: any = {
        username,
        deleted_at: IsNull(),
      };

      if (excludeUserId) {
        whereCondition.id = Not(excludeUserId);
      }

      const existingUser = await this.userRepository.findOne({
        where: whereCondition,
      });

      if (existingUser) {
        throw new ConflictException(`用户名已存在: ${username}`);
      }
    }

    if (email) {
      const whereCondition: any = {
        email,
        deleted_at: IsNull(),
      };

      if (excludeUserId) {
        whereCondition.id = Not(excludeUserId);
      }

      const existingUser = await this.userRepository.findOne({
        where: whereCondition,
      });

      if (existingUser) {
        throw new ConflictException(`邮箱已存在: ${email}`);
      }
    }
  }

  /**
   * 记录用户操作日志
   * @param queryRunner 查询运行器
   * @param userId 用户ID
   * @param module 操作模块
   * @param action 操作动作
   * @param details 操作详情
   * @param targetId 目标ID
   */
  private async logUserAction(
    queryRunner: any,
    userId: number,
    module: string,
    action: string,
    details: string,
    targetId?: number,
  ): Promise<void> {
    const log = this.logRepository.create({
      user_id: userId,
      module,
      action,
      details: targetId ? `${details} (ID: ${targetId})` : details,
      result: 1,
    });

    await queryRunner.manager.save(Log, log);
  }
}
