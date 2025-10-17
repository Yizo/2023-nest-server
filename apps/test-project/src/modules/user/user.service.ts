import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User, UserStatus } from './entities/user.entity';
import { Profile } from '@/modules/profile/entities/profile.entity';
import { Role } from '@/modules/roles/entities/roles.entity';
import { RolesService } from '@/modules/roles/roles.service';
import { ConfigService } from '@nestjs/config';
import { FindAllBodyDto, UpdateUserDto, CreateUserDto } from './dto/user-dto';
import { paginate } from '@/common';

@Injectable()
export class UserService {
  private defaultRole: Role | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly rolesService: RolesService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * 查询基本信息
   */
  async findUserById(id: number): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .leftJoin('user.profile', 'profile')
      .select([
        'user.id as id',
        'user.username as username',
        'user.status as status',
        'profile.gender as gender',
        'profile.avatar as avatar',
        'profile.phone as phone',
        'profile.email as email',
        'profile.address as address',
      ])
      .getRawOne();
    return user;
  }
  async findUsers(data: FindAllBodyDto) {
    const { page, pageSize, phone, status, username } = data;
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('profile', 'profile', 'profile.user_id = user.id')
      .select([
        'user.id as id',
        'user.username as username',
        'user.status as status',
        'profile.gender as gender',
        'profile.avatar as avatar',
        'profile.phone as phone',
        'profile.email as email',
        'profile.address as address',
      ])
      .orderBy('user.created_at', 'DESC');
    if (username) {
      query.andWhere('user.username LIKE :username', {
        username: `%${username}%`,
      });
    }
    if (phone) {
      query.andWhere('profile.phone = :phone', { phone });
    }
    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    return await paginate<User>(query, page, pageSize);
  }

  /**
   *
   */
  async findOneByUserNameAndPassword(
    username: string,
    password: string,
  ): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { username, password, status: UserStatus.Enabled },
    });
  }

  async findOneById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id, status: UserStatus.Enabled },
    });
  }

  async createUser(data: CreateUserDto): Promise<User> {
    return await this.userRepository.save(data);
  }

  async updateUser(data: UpdateUserDto): Promise<User> {
    return await this.userRepository.save(data);
  }

  async removeUser(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 预检查用户是否存在（避免无谓操作）
      const userExists = await manager
        .createQueryBuilder(User, 'user')
        .where('user.id = :id AND user.deleted_at IS NULL', { id })
        .getOne();
      if (!userExists) {
        throw new Error('用户不存在');
      }

      try {
        // 1. 删除用户与角色的关联（桥接表 user_role）
        // 用 QueryBuilder 更安全（自动参数绑定、防注入）
        await manager
          .createQueryBuilder()
          .delete()
          .from('user_role') // 直接指定表名（隐式桥接）
          .where('user_id = :id', { id })
          .execute();
      } catch (error) {
        throw error; // 回滚事务
      }

      // 2. 软删除用户资料 Profile
      try {
        await manager
          .createQueryBuilder()
          .update(Profile)
          .set({ deleted_at: new Date() })
          .where('user_id = :id', { id })
          .execute();
      } catch (error) {
        throw error;
      }

      // 3. 软删除用户
      try {
        await manager
          .createQueryBuilder()
          .softDelete()
          .from(User)
          .where('id = :id', { id })
          .execute();
      } catch (error) {
        throw error;
      }
    });
  }
}
