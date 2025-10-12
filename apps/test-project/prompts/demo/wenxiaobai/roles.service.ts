// ===== Role Service =====
// src/modules/role/services/role.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, Not, IsNull, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { User } from '../../user/entities/user.entity';
import { Log } from '../../logs/entities/log.entity';

/**
 * 角色权限服务
 * 负责角色和用户权限关联的管理
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
    private dataSource: DataSource,
  ) {}

  /**
   * 创建新角色
   * @param roleData 角色数据
   * @param operatorId 操作者用户ID
   * @returns 新创建的角色对象
   */
  async createRole(roleData: Partial<Role>, operatorId: number): Promise<Role> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 校验角色代码唯一性
      await this.checkRoleCodeUniqueness(roleData.code);

      const role = this.roleRepository.create(roleData);
      const savedRole = await queryRunner.manager.save(Role, role);

      // 记录操作日志
      await this.logRoleAction(
        queryRunner,
        operatorId,
        'create',
        `创建角色: ${role.name} (${role.code})`,
        savedRole.id,
      );

      await queryRunner.commitTransaction();
      return savedRole;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 查询角色列表
   * @param options 查询选项
   * @param options.page 页码
   * @param options.limit 每页数量
   * @param options.sortBy 排序字段
   * @param options.sortOrder 排序方向
   * @param options.keyword 关键词模糊搜索
   * @param options.status 状态筛选
   * @returns 角色列表和分页信息
   */
  async findRoles(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    keyword?: string;
    status?: number;
  }): Promise<{ roles: Role[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      keyword,
      status,
    } = options;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .where('role.deleted_at IS NULL');

    // 条件查询
    if (status !== undefined) {
      queryBuilder.andWhere('role.status = :status', { status });
    }

    // 模糊查询
    if (keyword) {
      queryBuilder.andWhere(
        '(role.name LIKE :keyword OR role.code LIKE :keyword OR role.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序和分页
    const [roles, total] = await Promise.all([
      queryBuilder
        .orderBy(`role.${sortBy}`, sortOrder)
        .offset((page - 1) * limit)
        .limit(limit)
        .getMany(),
      queryBuilder.getCount(),
    ]);

    return { roles, total };
  }

  /**
   * 更新角色信息
   * @param id 角色ID
   * @param roleData 角色更新数据
   * @param operatorId 操作者用户ID
   * @returns 更新后的角色对象
   */
  async updateRole(
    id: number,
    roleData: Partial<Role>,
    operatorId: number,
  ): Promise<Role> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证角色存在性
      const role = await this.roleRepository.findOne({
        where: { id, deleted_at: IsNull() },
      });
      if (!role) {
        throw new NotFoundException(`角色不存在 (ID: ${id})`);
      }

      // 校验角色代码唯一性（排除当前角色）
      if (roleData.code && roleData.code !== role.code) {
        await this.checkRoleCodeUniqueness(roleData.code, id);
      }

      // 更新角色
      await queryRunner.manager.update(
        Role,
        { id },
        { ...roleData, updated_at: new Date() },
      );

      // 记录操作日志
      await this.logRoleAction(
        queryRunner,
        operatorId,
        'update',
        `更新角色: ${role.name} (${role.code})`,
        id,
      );

      await queryRunner.commitTransaction();
      return await this.roleRepository.findOne({ where: { id } });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 为用户分配角色
   * @param userId 用户ID
   * @param roleIds 角色ID数组
   * @param operatorId 操作者用户ID
   * @returns 分配结果
   */
  async assignRolesToUser(
    userId: number,
    roleIds: number[],
    operatorId: number,
  ): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证用户存在性
      const user = await this.userRepository.findOne({
        where: { id: userId, deleted_at: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`用户不存在 (ID: ${userId})`);
      }

      // 验证所有角色存在性
      const roles = await this.roleRepository.find({
        where: { id: In(roleIds), deleted_at: IsNull() },
      });

      if (roles.length !== roleIds.length) {
        const foundIds = roles.map((role) => role.id);
        const missingIds = roleIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `角色不存在 (IDs: ${missingIds.join(', ')})`,
        );
      }

      // 删除用户现有角色关联
      await queryRunner.manager.delete(UserRole, { user_id: userId });

      // 创建新的角色关联
      const userRoles = roleIds.map((roleId) =>
        this.userRoleRepository.create({
          user_id: userId,
          role_id: roleId,
        }),
      );

      await queryRunner.manager.save(UserRole, userRoles);

      // 记录操作日志
      await this.logRoleAction(
        queryRunner,
        operatorId,
        'assign_roles',
        `为用户分配角色: ${user.username}, 角色IDs: ${roleIds.join(', ')}`,
        userId,
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
   * 获取用户的角色列表
   * @param userId 用户ID
   * @returns 用户角色列表
   */
  async getUserRoles(userId: number): Promise<Role[]> {
    // 验证用户存在性
    const user = await this.userRepository.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`用户不存在 (ID: ${userId})`);
    }

    const userRoles = await this.userRoleRepository.find({
      where: { user_id: userId },
    });

    const roleIds = userRoles.map((ur) => ur.role_id);

    if (roleIds.length === 0) {
      return [];
    }

    return await this.roleRepository.find({
      where: { id: In(roleIds), deleted_at: IsNull() },
    });
  }

  /**
   * 校验角色代码唯一性
   * @param code 角色代码
   * @param excludeRoleId 排除的角色ID
   */
  private async checkRoleCodeUniqueness(
    code: string,
    excludeRoleId?: number,
  ): Promise<void> {
    const whereCondition: any = {
      code,
      deleted_at: IsNull(),
    };

    if (excludeRoleId) {
      whereCondition.id = Not(excludeRoleId);
    }

    const existingRole = await this.roleRepository.findOne({
      where: whereCondition,
    });

    if (existingRole) {
      throw new ConflictException(`角色代码已存在: ${code}`);
    }
  }

  /**
   * 记录角色操作日志
   * @param queryRunner 查询运行器
   * @param userId 用户ID
   * @param action 操作动作
   * @param details 操作详情
   * @param targetId 目标ID
   */
  private async logRoleAction(
    queryRunner: any,
    userId: number,
    action: string,
    details: string,
    targetId?: number,
  ): Promise<void> {
    const log = this.logRepository.create({
      user_id: userId,
      module: 'role',
      action,
      details: targetId ? `${details} (ID: ${targetId})` : details,
      result: 1,
    });

    await queryRunner.manager.save(Log, log);
  }
}
