import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Role } from './entities/roles.entity';
import { Permission } from '@/modules/permissions/entities/permissions.entity';
import { RoleStatus, RoleType } from '@/enums/role.enum';
import { CreateRoleDto, FindAllRoleDto, UpdateRoleDto } from './dto/role-dto';
import {
  type PaginationResult,
  QueryBuilderFactory,
  QueryBuilderHelper,
} from '@/common';

@Injectable()
export class RolesService {
  private roleQueryBuilder: QueryBuilderHelper<Role>;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly queryBuilderFactory: QueryBuilderFactory,
  ) {
    this.roleQueryBuilder = this.queryBuilderFactory.createFromRepository(
      this.roleRepository,
    );
  }

  /**
   * 按id查询角色
   * @param showDeleted 是否显示软删除的角色, 默认false
   * @returns 角色
   */
  async findOne(id: number, showDeleted = false): Promise<Role | null> {
    return await this.roleQueryBuilder.findOne({
      conditions: [{ field: 'id', operator: 'eq', value: id }],
      withDeleted: showDeleted,
    });
  }

  /**
   * 按名称查询角色
   * @param name 角色名称
   * @param showDeleted 是否显示软删除的角色, 默认false
   * @returns 角色
   */
  async findByName(name: string, showDeleted = false): Promise<Role | null> {
    return await this.roleQueryBuilder.findOne({
      conditions: [{ field: 'name', operator: 'eq', value: name }],
      withDeleted: showDeleted,
    });
  }

  /**
   * 查询全部角色（分页）
   * @param showDeleted 是否显示软删除的角色, 默认false
   * @returns 角色列表
   */
  async findAll(
    data: FindAllRoleDto,
    showDeleted = false,
  ): Promise<PaginationResult<Role>> {
    const { page = 1, pageSize = 10, name, status, code, description } = data;

    // 构建查询条件
    const conditions = [];
    if (name) {
      conditions.push({
        field: 'name',
        operator: 'like',
        value: name,
      });
    }
    if (status !== undefined && status !== null) {
      conditions.push({
        field: 'status',
        operator: 'eq',
        value: status,
      });
    }
    if (code !== undefined && code !== null) {
      conditions.push({
        field: 'code',
        operator: 'eq',
        value: code,
      });
    }
    if (description) {
      conditions.push({
        field: 'description',
        operator: 'like',
        value: description,
      });
    }

    return await this.roleQueryBuilder.findPaginated(
      {
        conditions,
        orderBy: [
          {
            field: 'updated_at',
            direction: 'DESC',
          },
        ],
        withDeleted: showDeleted,
      },
      page,
      pageSize,
    );
  }

  // 创建角色
  async createRole(createRoleDto: CreateRoleDto): Promise<Role | null> {
    // 创建角色
    const createRoleHandler = async (createRoleDto: CreateRoleDto) => {
      const role = this.roleRepository.create(createRoleDto);
      await this.roleRepository.save(role);
      return role;
    };

    // 判断角色名称是否存在
    const existingRole = await this.findByName(createRoleDto.name, false);
    if (!existingRole) {
      return await createRoleHandler(createRoleDto);
    }
    // 如果角色已删除，则恢复
    if (existingRole.deleted_at) {
      await this.roleRepository.restore(existingRole.id);
      return this.findOne(existingRole.id);
    }
    throw new BadRequestException('角色已存在');
  }

  // 更新角色
  async updateRole(updateRoleDto: UpdateRoleDto): Promise<boolean> {
    const { id, name, description, status } = updateRoleDto;

    const result = await this.roleRepository
      .createQueryBuilder()
      .update(Role)
      .set({
        ...(name && { name }),
        ...(description && { description }),
        ...(status !== undefined && { status }),
      })
      .where('id = :id', { id })
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException('角色不存在或未修改');
    }
    return true;
  }

  /**
   * 删除角色（级联删除）
   * 软删除角色时需要级联处理相关的关联关系：
   * 1. 删除用户与角色的关联关系（user_role表）
   * 2. 删除角色与权限的关联关系（role_permission表）
   */
  async removeRole(id: number): Promise<void> {
    const role = await this.findOne(id);
    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 检查是否为系统角色（super admin），不允许删除
    if (role.code === RoleType.SuperAdmin) {
      throw new BadRequestException('系统超级管理员角色不允许删除');
    }

    await this.dataSource.transaction(async (manager) => {
      try {
        // 1. 删除用户与角色的关联关系
        await manager
          .createQueryBuilder()
          .delete()
          .from('user_role')
          .where('role_id = :roleId', { roleId: id })
          .execute();

        // 2. 删除角色与权限的关联关系
        await manager
          .createQueryBuilder()
          .delete()
          .from('role_permission')
          .where('role_id = :roleId', { roleId: id })
          .execute();

        // 3. 软删除角色
        await manager
          .createQueryBuilder()
          .softDelete()
          .from(Role)
          .where('id = :id', { id })
          .execute();
      } catch (error) {
        throw new BadRequestException(`删除角色失败: ${error.message}`);
      }
    });
  }

  /**
   * 为角色分配权限（覆盖模式）
   * 使用事务确保数据一致性：
   * 1. 删除角色现有的所有权限关联
   * 2. 添加新的权限关联
   *
   * @param roleId 角色ID
   * @param permissionIds 权限ID数组
   * @returns 更新后的角色信息（包含权限关联）
   */
  async assignPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    if (permissionIds.length === 0) {
      throw new BadRequestException('权限ID列表不能为空');
    }
    // 验证角色存在
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 验证所有权限ID都存在
    const existingPermissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
      select: ['id'],
    });

    if (existingPermissions.length !== permissionIds.length) {
      const foundIds = existingPermissions.map((p) => p.id);
      const invalidIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`权限ID不存在: ${invalidIds.join(', ')}`);
    }

    // 使用事务确保数据一致性
    return await this.dataSource.transaction(async (manager) => {
      try {
        // 1. 删除角色现有的所有权限关联
        await manager
          .createQueryBuilder()
          .delete()
          .from('role_permission')
          .where('role_id = :roleId', { roleId })
          .execute();

        // 2. 添加新的权限关联
        const values = permissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        }));

        await manager
          .createQueryBuilder()
          .insert()
          .into('role_permission')
          .values(values)
          .execute();

        // 3. 返回更新后的角色信息（包含权限关联）
        return await manager.findOne(Role, {
          where: { id: roleId },
          relations: ['permissions'],
        });
      } catch (error) {
        throw new BadRequestException(`分配权限失败: ${error.message}`);
      }
    });
  }

  // 获取角色的所有权限
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    return role.permissions;
  }

  /**
   * 为角色添加权限（追加模式）
   * 只添加角色当前没有的权限，已有的权限会被跳过
   * 使用事务确保数据一致性
   *
   * @param roleId 角色ID
   * @param permissionIds 要添加的权限ID数组
   * @returns 更新后的角色信息（包含权限关联）
   */
  async addPermissionsToRole(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    // 验证角色存在
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    if (permissionIds.length === 0) {
      throw new BadRequestException('权限ID列表不能为空');
    }

    // 验证权限ID存在性
    const existingPermissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
      select: ['id'],
    });

    if (existingPermissions.length !== permissionIds.length) {
      const foundIds = existingPermissions.map((p) => p.id);
      const invalidIds = permissionIds.filter((id) => !foundIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(`权限ID不存在: ${invalidIds.join(', ')}`);
      }
    }

    // 使用事务确保数据一致性
    return await this.dataSource.transaction(async (manager) => {
      try {
        // 获取角色现有的权限ID
        const existingRolePermissions = await manager
          .createQueryBuilder()
          .select('rp.permission_id', 'permissionId')
          .from('role_permission', 'rp')
          .where('rp.role_id = :roleId', { roleId })
          .getRawMany();

        const existingPermissionIds = existingRolePermissions.map(
          (rp) => rp.permissionId,
        );

        // 过滤出需要新增的权限ID（排除已存在的）
        const newPermissionIds = permissionIds.filter(
          (id) => !existingPermissionIds.includes(id),
        );

        // 如果没有新的权限要添加，直接返回角色信息
        if (newPermissionIds.length === 0) {
          return await manager.findOne(Role, {
            where: { id: roleId },
            relations: ['permissions'],
          });
        }

        // 批量插入新的权限关联
        const values = newPermissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        }));

        await manager
          .createQueryBuilder()
          .insert()
          .into('role_permission')
          .values(values)
          .execute();

        // 返回更新后的角色信息
        return await manager.findOne(Role, {
          where: { id: roleId },
          relations: ['permissions'],
        });
      } catch (error) {
        throw new BadRequestException(`添加权限失败: ${error.message}`);
      }
    });
  }

  /**
   * 从角色中移除权限
   * 删除角色与指定权限的关联关系
   * 使用事务确保数据一致性
   *
   * @param roleId 角色ID
   * @param permissionIds 要移除的权限ID数组
   * @returns 更新后的角色信息（包含权限关联）
   */
  async removePermissionsFromRole(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    // 验证角色存在
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    if (permissionIds.length === 0) {
      throw new BadRequestException('权限ID列表不能为空');
    }

    // 使用事务确保数据一致性
    return await this.dataSource.transaction(async (manager) => {
      try {
        // 删除指定的角色-权限关联
        await manager
          .createQueryBuilder()
          .delete()
          .from('role_permission')
          .where('role_id = :roleId AND permission_id IN (:...permissionIds)', {
            roleId,
            permissionIds,
          })
          .execute();

        // 返回更新后的角色信息
        return await manager.findOne(Role, {
          where: { id: roleId },
          relations: ['permissions'],
        });
      } catch (error) {
        throw new BadRequestException(`移除权限失败: ${error.message}`);
      }
    });
  }

  // 获取默认角色
  async getDefaultRole(): Promise<Role> {
    return await this.roleRepository.findOne({
      where: { status: RoleStatus.Enabled, description: '默认用户角色' },
    });
  }
}
