import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Role, RoleStatus } from './entities/roles.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role-dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * 角色唯一性检测
   */
  private async checkRoleUnique(
    name: string,
    code?: number,
  ): Promise<Role | null> {
    const queryBuilder = this.roleRepository.createQueryBuilder('role');
    queryBuilder.where('role.deleted_at IS NULL');
    queryBuilder.andWhere('role.name = :name', { name });
    if (code != null) {
      queryBuilder.andWhere('role.code = :code', { code });
    }
    return await queryBuilder.getOne();
  }

  /**
   * 查询全部角色
   * @param showDeleted 是否显示软删除的角色
   * @returns 角色列表
   */
  async findAll(showDeleted: boolean = false): Promise<Role[]> {
    if (showDeleted) {
      return await this.roleRepository.find({
        withDeleted: true,
      });
    } else {
      return await this.roleRepository.find({
        where: { deleted_at: IsNull() },
      });
    }
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    // 唯一性检测
    await this.checkRoleUnique(createRoleDto.name, createRoleDto.code);

    // 创建角色
    const role = this.roleRepository.create({
      ...createRoleDto,
      status: RoleStatus.Enabled,
    });
    const result = await this.roleRepository.save(role);

    // TODO: 记录操作日志

    return result;
  }

  async updateRole(
    id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<Role | null> {
    await this.roleRepository.update(id, updateRoleDto);
    return await this.roleRepository.findOne({ where: { id } });
  }

  async removeRole(id: number): Promise<void> {
    await this.roleRepository.delete(id);
  }

  // 查询全部角色, 带分页
  async findAllWithPagination(page: number, pageSize: number): Promise<Role[]> {
    return await this.roleRepository.find({
      where: { deleted_at: IsNull() },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { name } });
  }
}
