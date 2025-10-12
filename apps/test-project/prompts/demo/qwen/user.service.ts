// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Profile } from './profile.entity';
import { Logs } from './logs.entity';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Like } from 'typeorm';

/**
 * 用户服务 - 管理用户核心业务逻辑
 * 包含CRUD操作、关联关系维护和业务校验
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Logs) private readonly logRepository: Repository<Logs>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 查询构建器
   * 支持排序、分页、多条件组合查询
   *
   * @param queryOptions 查询参数对象
   * @returns 用户查询结果数组
   */
  private buildUserQuery(queryOptions: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }) {
    const {
      search,
      sortBy = 'id',
      sortOrder = 'ASC',
      limit,
      offset,
    } = queryOptions;

    const query = this.userRepository.createQueryBuilder('user');

    // 模糊查询：用户名
    if (search) {
      query.where('user.username LIKE :search', { search: `%${search}%` });
    }

    // 排序
    query.addOrderBy(`user.${sortBy}`, sortOrder);

    // 分页
    if (limit !== undefined) {
      query.limit(limit);
      if (offset !== undefined) {
        query.offset(offset);
      }
    }

    return query;
  }

  /**
   * 检查用户名唯一性
   * 用于创建用户和更新用户时的校验
   *
   * @param username 用户名
   * @param excludeId 要排除的用户ID（用于更新操作）
   * @returns 是否唯一
   */
  async isUsernameUnique(
    username: string,
    excludeId?: number,
  ): Promise<boolean> {
    const whereConditions = { username };
    if (excludeId) {
      whereConditions['id'] = { $ne: excludeId };
    }
    const existingUser = await this.userRepository.findOneBy(whereConditions);
    return !existingUser;
  }

  /**
   * 检查角色是否存在
   *
   * @param roleId 角色ID
   * @returns 角色是否存在
   */
  async isRoleExist(roleId: number): Promise<boolean> {
    const role = await this.roleRepository.findOneBy({ id: roleId });
    return !!role;
  }

  /**
   * 记录操作日志
   *
   * @param log 日志实体
   * @returns 创建的日志对象
   */
  private async createLog(log: Partial<Logs>): Promise<Logs> {
    const newLog = this.logRepository.create(log);
    return await this.logRepository.save(newLog);
  }

  /**
   * 创建用户
   * 包含事务处理，保证数据一致性
   *
   * @param user 用户实体
   * @param profile 用户资料
   * @param roleIds 角色ID数组
   * @returns 创建的用户对象
   */
  async createUser(
    user: Partial<User>,
    profile: Partial<Profile>,
    roleIds: number[],
  ): Promise<User> {
    // 校验用户名唯一性
    if (!(await this.isUsernameUnique(user.username))) {
      throw new Error('Username already exists');
    }

    let queryRunner: QueryRunner | undefined;

    try {
      // 初始化查询执行器
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      // 创建用户
      const newUser = await queryRunner.manager.getRepository(User).save(user);

      // 创建用户资料
      const newProfile = queryRunner.manager.getRepository(Profile).create({
        ...profile,
        userId: newUser.id,
      });
      await queryRunner.manager.getRepository(Profile).save(newProfile);

      // 创建用户-角色关系
      for (const roleId of roleIds) {
        if (!(await this.isRoleExist(roleId))) {
          throw new Error(`Role with id ${roleId} does not exist`);
        }

        await queryRunner.manager.getRepository(UserRole).save({
          userId: newUser.id,
          roleId,
        });
      }

      // 记录操作日志
      await this.createLog({
        userId: newUser.id,
        action: 'create',
        description: `User created with username: ${user.username}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

      // 提交事务
      await queryRunner.commitTransaction();

      // 返回完整用户信息
      return this.userRepository.findOneBy({ id: newUser.id });
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询执行器
      await queryRunner.release();
    }
  }

  /**
   * 查询用户
   * 支持模糊搜索、排序、分页
   *
   * @param queryOptions 查询参数对象
   * @returns 查询结果和总数
   */
  async findUsers(queryOptions: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ data: User[]; total: number }> {
    const { search, sortBy, sortOrder, limit, offset } = queryOptions;

    // 构建查询
    const mainQuery = this.buildUserQuery({
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    });
    const countQuery = this.buildUserQuery({ search });

    // 执行查询
    const [data, totalCount] = await Promise.all([
      mainQuery.getMany(),
      countQuery.getCount(),
    ]);

    return { data, total: totalCount };
  }

  /**
   * 查询用户及其角色
   * 使用连接查询获取用户和对应的角色信息
   *
   * @param queryOptions 查询参数对象
   * @returns 用户和角色信息
   */
  async findUsersWithRoles(queryOptions: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; total: number }> {
    const {
      search,
      sortBy = 'id',
      sortOrder = 'ASC',
      limit,
      offset,
    } = queryOptions;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect(
        'user_roles',
        'user_roles',
        'user.id = user_roles.userId',
      )
      .leftJoinAndSelect('roles', 'roles', 'user_roles.roleId = roles.id');

    // 模糊查询：用户名
    if (search) {
      query.where('user.username LIKE :search', { search: `%${search}%` });
    }

    // 排序
    query.addOrderBy(`user.${sortBy}`, sortOrder);

    // 分页
    if (limit !== undefined) {
      query.limit(limit);
      if (offset !== undefined) {
        query.offset(offset);
      }
    }

    const data = await query.getMany();
    const totalCount = await this.userRepository.count();

    // 整理数据格式
    return {
      data: data.map((user) => ({
        ...user,
        roles:
          (user as any).user_roles?.map((ur) => ({
            id: ur.roleId,
            name: ur.roles.find((r) => r.id === ur.roleId)?.name,
          })) || [],
      })),
      total: totalCount,
    };
  }

  /**
   * 查询用户详情
   * 获取用户的所有关联信息（资料、角色、日志）
   *
   * @param id 用户ID
   * @returns 用户详情信息
   */
  async findUserDetails(id: number): Promise<{
    user: User;
    profile: Profile;
    roles: Role[];
    logs: Logs[];
  }> {
    // 查询用户
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    // 查询用户资料
    const profile = await this.profileRepository.findOneBy({ userId: id });
    if (!profile || profile.deleted_at) {
      throw new Error(`Profile for user with ID ${id} not found or deleted`);
    }

    // 查询用户角色
    const userRoles = await this.userRoleRepository.find({
      where: { userId: id },
    });

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roles = await this.roleRepository.findByIds(roleIds);

    // 查询操作日志
    const logs = await this.logRepository.find({
      where: { userId: id },
      order: { created_at: 'DESC' },
    });

    return { user, profile, roles, logs };
  }

  /**
   * 更新用户
   * 包含事务处理，保持数据一致性
   *
   * @param id 用户ID
   * @param updates 用户更新数据
   * @param profileUpdates 用户资料更新数据
   * @param newRoleIds 新的角色ID数组
   * @returns 更新后的用户对象
   */
  async updateUser(
    id: number,
    updates: Partial<User>,
    profileUpdates: Partial<Profile>,
    newRoleIds: number[],
  ): Promise<User> {
    let queryRunner: QueryRunner | undefined;

    try {
      // 初始化查询执行器
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      // 查询现有用户
      const existingUser = await queryRunner.manager
        .getRepository(User)
        .findOneBy({ id });
      if (!existingUser) {
        throw new Error(`User with ID ${id} not found`);
      }

      // 如果用户名更新，检查唯一性
      if (updates.username && updates.username !== existingUser.username) {
        if (!(await this.isUsernameUnique(updates.username))) {
          throw new Error('Username already exists');
        }
      }

      // 更新用户
      await queryRunner.manager.getRepository(User).update(id, {
        ...updates,
        updated_at: new Date(),
      });

      // 更新用户资料
      const existingProfile = await queryRunner.manager
        .getRepository(Profile)
        .findOneBy({ userId: id });
      if (!existingProfile) {
        throw new Error(`Profile for user with ID ${id} not found`);
      }

      await queryRunner.manager.getRepository(Profile).update(
        { userId: id },
        {
          ...profileUpdates,
          updated_at: new Date(),
        },
      );

      // 更新角色关联
      // 1. 删除当前所有角色
      await queryRunner.manager.getRepository(UserRole).delete({ userId: id });

      // 2. 添加新的角色
      for (const roleId of newRoleIds) {
        if (!(await this.isRoleExist(roleId))) {
          throw new Error(`Role with id ${roleId} does not exist`);
        }

        await queryRunner.manager.getRepository(UserRole).save({
          userId: id,
          roleId,
        });
      }

      // 记录操作日志
      await this.createLog({
        userId: id,
        action: 'update',
        description: `User updated with ID: ${id}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

      // 提交事务
      await queryRunner.commitTransaction();

      // 返回更新后的用户
      return queryRunner.manager.getRepository(User).findOneBy({ id });
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询执行器
      await queryRunner.release();
    }
  }

  /**
   * 软删除用户
   * 包含手动维护关联数据的级联处理
   *
   * @param id 用户ID
   * @returns 是否成功
   */
  async softDeleteUser(id: number): Promise<boolean> {
    let queryRunner: QueryRunner | undefined;

    try {
      // 初始化查询执行器
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      // 查询现有用户
      const existingUser = await queryRunner.manager
        .getRepository(User)
        .findOneBy({ id });
      if (!existingUser) {
        throw new Error(`User with ID ${id} not found`);
      }

      // 软删除用户（更新 deleted_at）
      await queryRunner.manager.getRepository(User).update(id, {
        deleted_at: new Date(),
      });

      // 软删除用户资料
      await queryRunner.manager
        .getRepository(Profile)
        .update({ userId: id }, { deleted_at: new Date() });

      // 软删除关联角色（软删除实现通常不需要）
      // 这里可以选择简单删除还是软删除

      // 简单删除用户-角色关联
      await queryRunner.manager.getRepository(UserRole).delete({ userId: id });

      // 或者软删除角色关联（如果实现了软删除）
      // await queryRunner.manager.getRepository(UserRole).update({ userId: id }, { deleted_at: new Date() });

      // 记录操作日志
      await this.createLog({
        userId: id,
        action: 'delete',
        description: `User soft deleted with ID: ${id}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

      // 提交事务
      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询执行器
      await queryRunner.release();
    }
  }

  /**
   * 恢复用户及其关联数据
   * 撤销软删除操作
   *
   * @param id 用户ID
   * @returns 是否成功
   */
  async restoreUser(id: number): Promise<boolean> {
    let queryRunner: QueryRunner | undefined;

    try {
      // 初始化查询执行器
      queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      // 查询被软删除的用户
      const existingUser = await queryRunner.manager
        .getRepository(User)
        .findOne({
          where: { id },
          withDeleted: true,
        });

      if (!existingUser) {
        throw new Error(`User with ID ${id} not found`);
      }

      // 如果用户未被软删除，则无需操作
      if (!existingUser.deleted_at) {
        return true;
      }

      // 恢复用户
      await queryRunner.manager.getRepository(User).restore({ id });

      // 恢复用户资料
      await queryRunner.manager.getRepository(Profile).restore({ userId: id });

      // 记录恢复日志
      await this.createLog({
        userId: id,
        action: 'restore',
        description: `User restored with ID: ${id}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

      // 提交事务
      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询执行器
      await queryRunner.release();
    }
  }
}
