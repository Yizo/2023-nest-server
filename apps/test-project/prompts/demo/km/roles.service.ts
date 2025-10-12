import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Logs } from './logs.entity';

/**
 * Role 服务层
 * 提供角色管理与用户角色绑定能力
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Logs)
    private readonly logsRepo: Repository<Logs>,
  ) {}

  /**
   * 查询所有角色（无软删）
   * @returns 角色列表
   */
  async findAll(): Promise<Role[]> {
    return this.roleRepo
      .createQueryBuilder('r')
      .where('r.deletedAt IS NULL')
      .orderBy('r.id', 'ASC')
      .getMany();
  }

  /**
   * 给用户绑定角色（去重、日志）
   * @param userId 用户 id
   * @param roleIds 角色 id 数组
   */
  async assignRoles(userId: number, roleIds: number[]): Promise<void> {
    if (!roleIds.length) throw new BadRequestException('角色不能为空');

    const existRoles = await this.roleRepo
      .createQueryBuilder('r')
      .whereInIds(roleIds)
      .andWhere('r.deletedAt IS NULL')
      .getMany();
    if (existRoles.length !== roleIds.length)
      throw new NotFoundException('部分角色不存在');

    // 去重已绑定
    const existUserRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.deletedAt IS NULL')
      .andWhereInIds(roleIds.map((roleId) => ({ userId, roleId })))
      .getMany();
    const existRoleIds = existUserRoles.map((ur) => ur.roleId);
    const needAddIds = roleIds.filter((id) => !existRoleIds.includes(id));

    if (needAddIds.length) {
      const entities = needAddIds.map((roleId) =>
        this.userRoleRepo.create({ userId, roleId }),
      );
      await this.userRoleRepo.save(entities);
    }

    // 日志
    await this.logsRepo.save(
      this.logsRepo.create({
        userId,
        action: 'ASSIGN_ROLE',
        resourceType: 'UserRole',
        resourceId: userId,
        details: JSON.stringify({ roleIds: needAddIds }),
      }),
    );
  }
}
