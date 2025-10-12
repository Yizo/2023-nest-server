import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  QueryRunner,
  SelectQueryBuilder,
} from 'typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { Logs } from './logs.entity';

/**
 * 用户服务层
 * 提供用户、资料、角色、日志的联动业务实现
 * 所有关联操作均手动维护，禁用级联与自动化关系
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Logs)
    private readonly logsRepo: Repository<Logs>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 查询用户列表（支持分页、排序、条件、模糊、JOIN 角色）
   * @param dto 查询参数
   * @returns 用户列表与总数
   */
  async findUsers(dto: {
    page?: number;
    limit?: number;
    orderBy?: 'createdAt' | 'updatedAt';
    order?: 'ASC' | 'DESC';
    username?: string;
    email?: string;
    roleId?: number;
    isActive?: boolean;
  }): Promise<{ data: any[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      order = 'DESC',
      username,
      email,
      roleId,
      isActive,
    } = dto;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoin(UserRole, 'ur', 'ur.userId = u.id AND ur.deletedAt IS NULL')
      .leftJoin(Role, 'r', 'r.id = ur.roleId AND r.deletedAt IS NULL')
      .select([
        'u.id',
        'u.username',
        'u.email',
        'u.isActive',
        'u.createdAt',
        'u.updatedAt',
      ])
      .addSelect('GROUP_CONCAT(r.name)', 'roles')
      .where('u.deletedAt IS NULL');

    if (username)
      qb.andWhere('u.username LIKE :username', { username: `%${username}%` });
    if (email) qb.andWhere('u.email LIKE :email', { email: `%${email}%` });
    if (roleId) qb.andWhere('ur.roleId = :roleId', { roleId });
    if (typeof isActive === 'boolean')
      qb.andWhere('u.isActive = :isActive', { isActive });

    qb.groupBy('u.id');
    qb.orderBy(`u.${orderBy}`, order);
    qb.limit(limit);
    qb.offset((page - 1) * limit);

    const [data, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

    return { data, total };
  }

  /**
   * 创建用户（含 Profile、初始角色、事务、日志）
   * @param param0 创建参数
   * @returns 创建后的用户 id
   */
  async createUser(param: {
    username: string;
    password: string;
    email?: string;
    profile: { fullName?: string; avatarUrl?: string; birthday?: string };
    roleIds?: number[];
  }): Promise<number> {
    const { username, password, email, profile, roleIds = [] } = param;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 唯一性校验
      const exist = await queryRunner.manager
        .createQueryBuilder(User, 'u')
        .where('u.username = :username', { username })
        .orWhere('u.email = :email', { email })
        .getOne();
      if (exist) throw new BadRequestException('用户名或邮箱已存在');

      // 创建用户
      const user = queryRunner.manager.create(User, {
        username,
        password, // 实际应加密
        email,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      // 创建 Profile
      const profileEntity = queryRunner.manager.create(Profile, {
        userId: savedUser.id,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        birthday: profile.birthday,
      });
      await queryRunner.manager.save(Profile, profileEntity);

      // 绑定角色
      if (roleIds.length) {
        const roles = await queryRunner.manager
          .createQueryBuilder(Role, 'r')
          .whereInIds(roleIds)
          .andWhere('r.deletedAt IS NULL')
          .getMany();
        if (roles.length !== roleIds.length)
          throw new BadRequestException('部分角色不存在');
        const userRoles = roleIds.map((roleId) =>
          queryRunner.manager.create(UserRole, {
            userId: savedUser.id,
            roleId,
          }),
        );
        await queryRunner.manager.save(UserRole, userRoles);
      }

      // 写日志
      await this.logsRepo.save(
        this.logsRepo.create({
          userId: savedUser.id,
          action: 'CREATE',
          resourceType: 'User',
          resourceId: savedUser.id,
          details: JSON.stringify({ username, email }),
        }),
      );

      await queryRunner.commitTransaction();
      return savedUser.id;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新用户（同步更新 Profile，事务，日志）
   * @param userId 用户 id
   * @param dto 更新内容
   */
  async updateUser(
    userId: number,
    dto: {
      email?: string;
      isActive?: boolean;
      profile?: { fullName?: string; avatarUrl?: string; birthday?: string };
    },
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'u')
        .where('u.id = :userId', { userId })
        .andWhere('u.deletedAt IS NULL')
        .getOne();
      if (!user) throw new NotFoundException('用户不存在');

      if (dto.email && dto.email !== user.email) {
        const exist = await queryRunner.manager
          .createQueryBuilder(User, 'u')
          .where('u.email = :email', { email: dto.email })
          .getOne();
        if (exist) throw new BadRequestException('邮箱已存在');
      }

      // 更新 User
      await queryRunner.manager
        .createQueryBuilder()
        .update(User)
        .set({ email: dto.email, isActive: dto.isActive })
        .where('id = :userId', { userId })
        .execute();

      // 同步更新 Profile
      if (dto.profile) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(Profile)
          .set({
            fullName: dto.profile.fullName,
            avatarUrl: dto.profile.avatarUrl,
            birthday: dto.profile.birthday,
          })
          .where('userId = :userId', { userId })
          .execute();
      }

      // 写日志
      await queryRunner.manager.save(Logs, {
        userId,
        action: 'UPDATE',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify(dto),
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 软删用户（同步软删 Profile、Logs、UserRole，事务，日志）
   * @param userId 用户 id
   */
  async softDeleteUser(userId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'u')
        .where('u.id = :userId', { userId })
        .andWhere('u.deletedAt IS NULL')
        .getOne();
      if (!user) throw new NotFoundException('用户不存在');

      const now = new Date();
      // 软删 User
      await queryRunner.manager
        .createQueryBuilder()
        .update(User)
        .set({ deletedAt: now })
        .where('id = :userId', { userId })
        .execute();

      // 软删 Profile
      await queryRunner.manager
        .createQueryBuilder()
        .update(Profile)
        .set({ deletedAt: now })
        .where('userId = :userId', { userId })
        .execute();

      // 软删 Logs
      await queryRunner.manager
        .createQueryBuilder()
        .update(Logs)
        .set({ deletedAt: now })
        .where('userId = :userId', { userId })
        .execute();

      // 软删 UserRole
      await queryRunner.manager
        .createQueryBuilder()
        .update(UserRole)
        .set({ deletedAt: now })
        .where('userId = :userId', { userId })
        .execute();

      // 写日志
      await queryRunner.manager.save(Logs, {
        userId,
        action: 'DELETE',
        resourceType: 'User',
        resourceId: userId,
        details: JSON.stringify({ username: user.username }),
      });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
