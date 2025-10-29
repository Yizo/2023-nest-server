import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, type PaginationResult } from '@/common';

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
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  async findAll(
    query: FindAllPermissionDto,
  ): Promise<PaginationResult<Permission>> {
    const { page = 1, pageSize = 10, code, name, type, status } = query;

    const queryBuilder =
      this.permissionsRepository.createQueryBuilder('permission');

    if (code) {
      queryBuilder.andWhere('permission.code LIKE :code', {
        code: `%${code}%`,
      });
    }

    if (name) {
      queryBuilder.andWhere('permission.name LIKE :name', {
        name: `%${name}%`,
      });
    }

    if (type !== undefined) {
      queryBuilder.andWhere('permission.type = :type', { type });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('permission.status = :status', { status });
    }

    queryBuilder.orderBy('permission.updated_at', 'DESC');

    return await paginate<Permission>(queryBuilder, page, pageSize);
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

  async remove(id: number): Promise<void> {
    await this.permissionsRepository.softDelete(id);
  }

  async findByCodes(codes: string[]): Promise<Permission[]> {
    return this.permissionsRepository
      .createQueryBuilder('permission')
      .where('permission.code IN (:...codes)', { codes })
      .getMany();
  }
}
