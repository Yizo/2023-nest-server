import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/roles.entity';
import { Permission } from '@/modules/permissions/entities/permissions.entity';
import { RoleStatus, RoleType } from '@/enums/role.enum';
import { CreateRoleDto, FindAllRoleDto, UpdateRoleDto } from './dto/role-dto';
import { paginate, type PaginationResult } from '@/common';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * 按id查询角色
   * @param showDeleted 是否显示软删除的角色, 默认false
   * @returns 角色
   */
  async findOne(id: number, showDeleted = false): Promise<Role | null> {
    const queryBuilder = this.roleRepository.createQueryBuilder('r');
    queryBuilder
      .select(['r.id', 'r.name', 'r.code', 'r.description', 'r.status'])
      .where('r.id = :id', { id })
      .andWhere('r.code != :code', { code: RoleType.SuperAdmin });
    if (showDeleted) {
      queryBuilder.withDeleted();
    }
    return await queryBuilder.getOne();
  }

  /**
   * 按名称查询角色
   * @param name 角色名称
   * @param showDeleted 是否显示软删除的角色, 默认false
   * @returns 角色
   */
  async findByName(name: string, showDeleted = false): Promise<Role | null> {
    const queryBuilder = this.roleRepository.createQueryBuilder('r');
    queryBuilder.where('r.name = :name', { name });
    if (showDeleted) {
      queryBuilder.withDeleted();
    }
    return await queryBuilder.getOne();
  }

  /**
   * 查询全部角色
   * @param showDeleted 是否显示软删除的角色, 默认false
   * @returns 角色列表
   */
  async findAll(
    data: FindAllRoleDto,
    showDeleted = false,
  ): Promise<PaginationResult<Role>> {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('r')
      .select([
        'r.id as id',
        'r.name as name',
        'r.code as code',
        'r.description as description',
        'r.status as status',
      ]);
    if (data.name) {
      queryBuilder.andWhere('r.name LIKE :name', { name: `%${data.name}%` });
    }
    if (data.status != null) {
      queryBuilder.andWhere('r.status = :status', { status: data.status });
    }
    if (data.code != null) {
      queryBuilder.andWhere('r.code = :code', { code: data.code });
    }
    if (data.description) {
      queryBuilder.andWhere('r.description LIKE :description', {
        description: `%${data.description}%`,
      });
    }
    if (showDeleted) {
      queryBuilder.withDeleted();
    }
    queryBuilder.orderBy('r.updated_at', 'DESC');
    return await paginate<Role>(queryBuilder, data.page, data.pageSize);
  }

  // 创建角色
  async createRole(createRoleDto: CreateRoleDto): Promise<Role | null> {
    // TODO: 权限验证

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

  // 删除角色
  async removeRole(id: number): Promise<void> {
    const role = await this.findOne(id);
    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    await this.roleRepository.softDelete(id);
  }

  // 为角色分配权限[覆盖]
  async assignPermissions(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 获取权限列表
    const permissions = await this.roleRepository.manager
      .getRepository(Permission)
      .find({
        where: {
          id: In(permissionIds),
        },
      });

    // 分配权限
    role.permissions = permissions;
    return await this.roleRepository.save(role);
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

  // 为角色添加权限[追加]
  async addPermissionsToRole(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 获取要添加的权限
    const permissions = await this.roleRepository.manager
      .getRepository(Permission)
      .find({
        where: {
          id: In(permissionIds),
        },
      });

    // 合并现有权限和新权限
    const existingPermissionIds = role.permissions.map((p) => p.id);
    const newPermissions = permissions.filter(
      (p) => !existingPermissionIds.includes(p.id),
    );
    role.permissions = [...role.permissions, ...newPermissions];

    return await this.roleRepository.save(role);
  }

  // 从角色中移除权限
  async removePermissionsFromRole(
    roleId: number,
    permissionIds: number[],
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new BadRequestException('角色不存在');
    }

    // 过滤掉要移除的权限
    role.permissions = role.permissions.filter(
      (permission) => !permissionIds.includes(permission.id),
    );

    return await this.roleRepository.save(role);
  }

  // 获取默认角色
  async getDefaultRole(): Promise<Role> {
    return await this.roleRepository.findOne({
      where: { status: RoleStatus.Enabled, description: '默认用户角色' },
    });
  }
}
