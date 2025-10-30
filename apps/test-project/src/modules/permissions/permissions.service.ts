import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  type PaginationResult,
  QueryBuilderFactory,
  QueryBuilderHelper,
} from '@/common';

import { Permission } from './entities/permissions.entity';
import { PermissionType } from '@/enums/permission.enum';

export class CreatePermissionDto {
  code: string;
  name: string;
  type: PermissionType;
  description?: string;
  apiPath?: string;
  method?: string;
  status?: number;
}

export class UpdatePermissionDto {
  code?: string;
  name?: string;
  type?: PermissionType;
  description?: string;
  apiPath?: string;
  method?: string;
  status?: number;
}

export class FindAllPermissionDto {
  page?: number;
  pageSize?: number;
  code?: string;
  name?: string;
  type?: PermissionType;
  status?: number;
}

@Injectable()
export class PermissionsService {
  private permissionQueryBuilder: QueryBuilderHelper<Permission>;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    private readonly queryBuilderFactory: QueryBuilderFactory,
  ) {
    this.permissionQueryBuilder = this.queryBuilderFactory.createFromRepository(
      this.permissionsRepository,
    );
  }

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  /**
   * 分页查询权限列表
   */
  async findAll(
    query: FindAllPermissionDto,
  ): Promise<PaginationResult<Permission>> {
    const { page = 1, pageSize = 10, code, name, type, status } = query;

    // 构建查询条件
    const conditions = [];
    if (code) {
      conditions.push({
        field: 'code',
        operator: 'like',
        value: code,
      });
    }
    if (name) {
      conditions.push({
        field: 'name',
        operator: 'like',
        value: name,
      });
    }
    if (type !== undefined) {
      conditions.push({
        field: 'type',
        operator: 'eq',
        value: type,
      });
    }
    if (status !== undefined) {
      conditions.push({
        field: 'status',
        operator: 'eq',
        value: status,
      });
    }

    return await this.permissionQueryBuilder.findPaginated(
      {
        conditions,
        orderBy: [
          {
            field: 'updated_at',
            direction: 'DESC',
          },
        ],
      },
      page,
      pageSize,
    );
  }

  async findOne(id: number): Promise<Permission> {
    return this.permissionsRepository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Permission> {
    return this.permissionsRepository.findOne({ where: { code } });
  }

  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    await this.permissionsRepository.update(id, updatePermissionDto);
    return this.findOne(id);
  }

  /**
   * 删除权限（级联删除）
   * 软删除权限时需要级联处理相关的关联关系：
   * 1. 删除角色与权限的关联关系（role_permission表）
   *
   * @param id 权限ID
   */
  async remove(id: number): Promise<void> {
    // 验证权限存在
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new BadRequestException('权限不存在');
    }

    // 使用事务确保数据一致性
    await this.dataSource.transaction(async (manager) => {
      try {
        // 1. 删除角色与权限的关联关系
        await manager
          .createQueryBuilder()
          .delete()
          .from('role_permission')
          .where('permission_id = :permissionId', { permissionId: id })
          .execute();

        // 2. 软删除权限
        await manager
          .createQueryBuilder()
          .softDelete()
          .from(Permission)
          .where('id = :id', { id })
          .execute();
      } catch (error) {
        throw new BadRequestException(`删除权限失败: ${error.message}`);
      }
    });
  }

  /**
   * 根据权限编码批量查询权限
   */
  async findByCodes(codes: string[]): Promise<Permission[]> {
    return await this.permissionQueryBuilder.findWithRelations({
      conditions: [
        {
          field: 'code',
          operator: 'in',
          value: codes,
        },
      ],
    });
  }
}
