// role.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Logs } from './logs.entity';

/**
 * 角色服务 - 管理权限角色及用户关联
 * 包含CRUD操作、关联关系维护和业务校验
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Logs) private readonly logRepository: Repository<Logs>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 查询构建器
   * 支持排序、分页、条件组合查询
   *
   * @param queryOptions 查询参数对象
   * @returns 查询结果和总数
   */
  private buildRoleQuery(queryOptions: {
    search?: string;
    systemRole?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }) {
    const {
      search,
      systemRole,
      sortBy = 'id',
      sortOrder = 'ASC',
      limit,
      offset,
    } = queryOptions;

    const query = this.roleRepository.createQueryBuilder('role');

    // 条件筛选
    if (search) {
      query.where('role.name LIKE :search OR role.description LIKE :search', {
        search: `%${search}%`,
      });
    }

    if (systemRole !== undefined) {
      query.andWhere('role.systemRole = :systemRole', { systemRole });
    }

    // 排序
    query.addOrderBy(`role.${sortBy}`, sortOrder);

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
   * 查询所有角色
   * 支持模糊查询、排序和分页
   *
   * @param queryOptions 查询参数对象
   * @returns 查询结果和总数
   */
  async getRoles(queryOptions: {
    search?: string;
    systemRole?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ data: Role[]; total: number }> {
    const { search, systemRole, sortBy, sortOrder, limit, offset } =
      queryOptions;

    // 构建查询
    const mainQuery = this.buildRoleQuery({
      search,
      systemRole,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    const countQuery = this.buildRoleQuery({
      search,
      systemRole,
    });

    // 执行查询
    const [data, totalCount] = await Promise.all([
      mainQuery.getMany(),
      countQuery.getCount(),
    ]);

    return { data, total: totalCount };
  }

  /**
   * 获取角色详情及关联用户
   *
   * @param id 角色ID
   * @returns 角色详情及关联用户信息
   */
  async getRoleDetails(id: number): Promise<{
    role: Role;
    users: User[];
    userCount: number;
  }> {
    // 查询角色
    const role = await this.roleRepository.findOneBy({ id });
    if (!role) {
      throw new Error(`Role with ID ${id} not found`);
    }

    // 查询关联用户
    const userRoles = await this.userRoleRepository.find({
      where: { roleId: id },
    });

    const userIds = userRoles.map((ur) => ur.userId);
    const users = await this.roleRepository.manager
      .getRepository(User)
      .findByIds(userIds);

    return {
      role,
      users,
      userCount: userRoles.length,
    };
  }

  /**
   * 创建角色
   *
   * @param role 角色实体
   * @returns 创建的角色对象
   */
  async createRole(role: Partial<Role>): Promise<Role> {
    // 校验角色名称唯一性
    const existingRole = await this.roleRepository.findOneBy({
      name: role.name,
    });
    if (existingRole) {
      throw new Error(`Role with name ${role.name} already exists`);
    }

    // 创建角色
    const newRole = this.roleRepository.create(role);
    const savedRole = await this.roleRepository.save(newRole);

    // 记录日志
    await this.logRepository.save({
      userId: 0, // 系统操作暂用ID 0
      action: 'create',
      description: `Role created with name: ${role.name}`,
      ipAddress: '127.0.0.1', // 实际使用应从请求中获取
      userAgent: 'Postman', // 实际使用应从请求中获取
    });

    return savedRole;
  }

  /**
   * 更新角色
   *
   * @param id 角色ID
   * @param updates 角色更新数据
   * @returns 更新后的角色对象
   */
  async updateRole(id: number, updates: Partial<Role>): Promise<Role> {
    // 如果名称更新，检查唯一性
    if (updates.name) {
      const existingRole = await this.roleRepository.findOneBy({
        name: updates.name,
      });
      if (existingRole && existingRole.id !== id) {
        throw new Error(`Role with name ${updates.name} already exists`);
      }
    }

    // 查询现有角色
    const existingRole = await this.roleRepository.findOneBy({ id });
    if (!existingRole) {
      throw new Error(`Role with ID ${id} not found`);
    }

    // 更新角色
    await this.roleRepository.update(id, {
      ...updates,
      updated_at: new Date(),
    });

    // 记录日志
    await this.logRepository.save({
      userId: 0, // 系统操作暂用ID 0
      action: 'update',
      description: `Role updated with ID: ${id}`,
      ipAddress: '127.0.0.1', // 实际使用应从请求中获取
      userAgent: 'Postman', // 实际使用应从请求中获取
    });

    // 返回更新后的角色
    return this.roleRepository.findOneBy({ id });
  }

  /**
   * 删除角色
   * 包含检查用户关联关系
   *
   * @param id 角色ID
   * @returns 是否成功
   */
  async deleteRole(id: number): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 查询角色
      const role = await queryRunner.manager
        .getRepository(Role)
        .findOneBy({ id });
      if (!role) {
        throw new Error(`Role with ID ${id} not found`);
      }

      // 校验是否有用户使用该角色
      const userRoles = await queryRunner.manager.getRepository(UserRole).find({
        where: { roleId: id },
      });

      if (userRoles.length > 0) {
        throw new Error(
          `Cannot delete role with ID ${id} because it is associated with users`,
        );
      }

      // 删除角色
      await queryRunner.manager.getRepository(Role).delete({ id });

      // 记录日志
      await this.logRepository.save({
        userId: 0, // 系统操作暂用ID 0
        action: 'delete',
        description: `Role deleted with ID: ${id}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

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
   * 更新用户角色
   * 手动维护用户-角色关系
   *
   * @param userId 用户ID
   * @param roleIds 角色ID数组
   * @returns 更新后的用户角色数组
   */
  async updateUserRoles(
    userId: number,
    roleIds: number[],
  ): Promise<UserRole[]> {
    // 校验用户是否存在
    const user = await this.roleRepository.manager
      .getRepository(User)
      .findOneBy({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 删除现有所有用户角色
      await queryRunner.manager.getRepository(UserRole).delete({ userId });

      // 创建新的用户角色
      const newRoles = [];
      for (const roleId of roleIds) {
        // 校验角色是否存在
        const role = await queryRunner.manager
          .getRepository(Role)
          .findOneBy({ id: roleId });
        if (!role) {
          throw new Error(`Role with ID ${roleId} not found`);
        }

        // 创建新角色
        const newRole = queryRunner.manager.getRepository(UserRole).create({
          userId,
          roleId,
        });
        newRoles.push(
          await queryRunner.manager.getRepository(UserRole).save(newRole),
        );
      }

      // 记录日志
      await this.logRepository.save({
        userId,
        action: 'update_roles',
        description: `User roles updated with IDs: ${roleIds.join(',')}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

      await queryRunner.commitTransaction();
      return newRoles;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
