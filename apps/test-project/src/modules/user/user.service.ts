import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RoleType } from '@/enums/role.enum';
import { User, UserStatus } from './entities/user.entity';
import { Profile } from '@/modules/profile/entities/profile.entity';
import { FindAllBodyDto, UpdateUserDto, CreateUserDto } from './dto/user-dto';
import { QueryBuilderFactory, QueryBuilderHelper } from '@/common';
import { RolesService } from '@/modules/roles/roles.service';
import { ProfileService } from '@/modules/profile/profile.service';

@Injectable()
export class UserService {
  private userQueryBuilder: QueryBuilderHelper<User>;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queryBuilderFactory: QueryBuilderFactory,
    private readonly rolesService: RolesService,
    private readonly profileService: ProfileService,
  ) {
    this.userQueryBuilder = this.queryBuilderFactory.createFromRepository(
      this.userRepository,
    );
  }

  /**
   * 查询基本信息（包含Profile关联信息）
   */
  async findUserById(id: number): Promise<User | null> {
    const result = await this.userQueryBuilder.findOne({
      joins: [
        {
          property: 'profile',
          alias: 'p',
          type: 'leftJoinAndSelect',
        },
      ],
      conditions: [
        {
          field: 'id',
          operator: 'eq',
          value: id,
        },
      ],
    });
    console.log('findUserById result:', JSON.stringify(result, null, 2));
    return result;
  }
  /**
   * 分页查询用户列表（包含Profile关联信息）
   */
  async findUsers(data: FindAllBodyDto) {
    const { page = 1, pageSize = 10, phone, status, username } = data;

    // 构建查询条件
    const conditions = [];
    if (username) {
      conditions.push({
        field: 'username',
        operator: 'like',
        value: username,
      });
    }
    if (phone) {
      conditions.push({
        field: 'p.phone',
        operator: 'eq',
        value: phone,
      });
    }
    if (status !== undefined) {
      conditions.push({
        field: 'status',
        operator: 'eq',
        value: status,
      });
    }

    return await this.userQueryBuilder.findPaginated(
      {
        joins: [
          {
            property: 'profile',
            alias: 'p',
            type: 'leftJoinAndSelect',
          },
          {
            property: 'roles',
            alias: 'r',
            type: 'leftJoinAndSelect',
          },
        ],
        conditions,
        orderBy: [
          {
            field: 'created_at',
            direction: 'DESC',
          },
        ],
      },
      page,
      pageSize,
      true,
    );
  }

  /**
   * 根据用户名和密码查询用户, 登录用
   */
  async findOneByUserNameAndPassword(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        username,
      },
      select: ['id', 'username', 'password', 'status', 'deleted_at'],
      withDeleted: true,
    });
    console.log('findOneByUserNameAndPassword user:', user, {
      username,
      password,
    });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    if (user.password !== password + '') {
      throw new BadRequestException('账号或密码错误');
    }
    if (user.status !== UserStatus.Enabled) {
      throw new BadRequestException('用户已禁用');
    }
    if (user.deleted_at) {
      throw new BadRequestException('用户已删除，请联系管理员');
    }
    return user;
  }

  /**
   * 根据ID查询用户详情（包含角色、权限和Profile关联信息）
   */
  async findOneById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id, status: UserStatus.Enabled },
      relations: ['roles', 'roles.permissions', 'profile'],
    });
  }

  /**
   * 创建用户（级联创建）
   * 创建用户时自动执行以下操作：
   * 1. 创建用户基本信息
   * 2. 创建用户Profile（如果需要）
   * 3. 分配默认角色
   *
   * @param data 用户创建数据
   * @returns 创建的用户完整信息（包含Profile和角色）
   */
  async createUser(data: CreateUserDto): Promise<User> {
    // 验证用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: data.username },
      withDeleted: true, // 包括已软删除的用户
    });

    if (existingUser) {
      if (existingUser.deleted_at) {
        throw new BadRequestException(
          '用户名已存在但已被删除，请联系管理员恢复',
        );
      } else {
        throw new BadRequestException('用户名已存在');
      }
    }

    // 使用事务确保数据一致性
    return await this.dataSource.transaction(async (manager) => {
      try {
        // 1. 创建用户基本信息
        const user = manager.create(User, {
          username: data.username,
          password: data.password,
          status: UserStatus.Enabled,
        });
        const savedUser = await manager.save(User, user);

        // 2. 创建用户Profile（可选，通过单独的API创建）
        // 这里暂时不自动创建Profile，让前端通过单独的API创建

        // 3. 分配默认角色
        try {
          const defaultRole = await this.rolesService.getDefaultRole();
          if (defaultRole) {
            // 创建用户-角色关联
            await manager
              .createQueryBuilder()
              .insert()
              .into('user_role')
              .values({
                user_id: savedUser.id,
                role_id: defaultRole.id,
              })
              .execute();
          }
        } catch (roleError) {
          // 如果默认角色不存在，记录警告但不影响用户创建
          console.warn('默认角色不存在，跳过角色分配:', roleError.message);
        }

        // 4. 返回完整的用户信息
        return await manager.findOne(User, {
          where: { id: savedUser.id },
          relations: ['profile'],
        });
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(`创建用户失败: ${error.message}`);
      }
    });
  }

  /**
   * 更新用户（级联更新）
   * 更新用户信息，包含必要的验证和关联关系处理
   *
   * @param data 用户更新数据
   * @returns 更新后的用户完整信息
   */
  async updateUser(data: UpdateUserDto): Promise<User> {
    const { id, username, password } = data;

    // 验证用户存在
    const existingUser = await this.userRepository.findOne({
      where: { id },
    });

    if (!existingUser) {
      throw new BadRequestException('用户不存在');
    }

    // 如果更新用户名，检查是否与其他用户冲突
    if (username && username !== existingUser.username) {
      const userWithSameUsername = await this.userRepository.findOne({
        where: { username },
        withDeleted: true,
      });

      if (userWithSameUsername && userWithSameUsername.id !== id) {
        if (userWithSameUsername.deleted_at) {
          throw new BadRequestException(
            '用户名已存在但已被删除，请联系管理员恢复',
          );
        } else {
          throw new BadRequestException('用户名已存在');
        }
      }
    }

    // 构建更新数据
    const updateData: Partial<User> = {};
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;

    // 如果没有需要更新的字段，返回原数据
    if (Object.keys(updateData).length === 0) {
      return await this.userRepository.findOne({
        where: { id },
        relations: ['profile'],
      });
    }

    // 更新用户基本信息
    await this.userRepository.update(id, updateData);

    // 返回更新后的完整用户信息
    return await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
  }

  /**
   * 删除用户（级联删除）
   * 软删除用户时需要级联处理相关的关联关系：
   * 1. 删除用户与角色的关联关系（user_role表）
   * 2. 软删除用户资料 Profile
   * 3. 软删除用户
   * 4. 如果用户是超级管理员，则不能删除
   *
   * @param id 用户ID
   */
  async removeUser(id: number): Promise<void> {
    // 验证用户存在
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (user.roles.length) {
      if (user.roles.some((role) => role.code === RoleType.SuperAdmin)) {
        throw new BadRequestException('超级管理员用户不能删除');
      }
    }

    await this.dataSource.transaction(async (manager) => {
      try {
        // 1. 删除用户与角色的关联关系
        await manager
          .createQueryBuilder()
          .delete()
          .from('user_role')
          .where('user_id = :id', { id })
          .execute();

        // 2. 软删除用户资料 Profile
        await manager
          .createQueryBuilder()
          .update(Profile)
          .set({ deleted_at: new Date() })
          .where('user_id = :id', { id })
          .execute();

        // 3. 软删除用户
        await manager
          .createQueryBuilder()
          .softDelete()
          .from(User)
          .where('id = :id', { id })
          .execute();
      } catch (error) {
        throw new BadRequestException(`删除用户失败: ${error.message}`);
      }
    });
  }
}
