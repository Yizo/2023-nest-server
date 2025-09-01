import { Injectable, Logger, HttpStatus, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '@/modules/roles/roles.entity'; // 引入 Role 实体
import { RolesService } from '@/modules/roles/roles.service'; // 引入 RolesService
import { ConfigService } from '@nestjs/config'; // 引入 ConfigService
import { FindAllBodyDto, UpdateUserDto, CreateUserDto } from './dto/user-dto';
import { hash, compare } from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  private defaultRole: Role | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly rolesService: RolesService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    // 应用启动时创建默认角色
    this.defaultRole = await this.createDefaultRole();
  }

  private async createDefaultRole(): Promise<Role | null> {
    // 从配置文件中获取默认角色ID或名称
    const defaultRoleId = this.configService.get<number>('defaultRole.id');
    const defaultRoleName =
      this.configService.get<string>('defaultRole.name') || '普通用户';

    // 首先尝试通过ID查找默认角色
    if (defaultRoleId) {
      const role = await this.rolesService.findOne(defaultRoleId);
      if (role) {
        return role;
      }
    }

    // 如果通过ID找不到，则尝试通过名称查找
    let role = await this.rolesService.findByName(defaultRoleName);
    if (!role) {
      // 如果都找不到，则创建默认角色
      try {
        role = await this.rolesService.create({ name: defaultRoleName });
      } catch (error) {
        // 如果创建失败，则查找第一个可用角色
        const roles = await this.rolesService.findAll(1, 1);
        if (roles[0].length > 0) {
          role = roles[0][0];
        }
      }
    }
    return role;
  }

  async create(createUserDto: CreateUserDto) {
    // 处理角色关联
    let roles: Role[] = [];
    if (createUserDto.roles && createUserDto.roles.length > 0) {
      roles = await this.roleRepository.findBy({ id: In(createUserDto.roles) });
    } else {
      // 如果没有指定角色，则分配默认角色
      if (this.defaultRole) {
        roles = [this.defaultRole];
      }
    }

    const hashedPassword = await hash(createUserDto.password, 10);
    createUserDto.password = hashedPassword;

    const newUser = this.userRepository.create({
      ...createUserDto,
      roles,
    });

    await this.userRepository.save(newUser);
    return {
      code: 0,
      message: '新增成功',
    };
  }

  async findAll(body: FindAllBodyDto) {
    const { page = 1, pageSize = 10, sort = 'ASC', gender, role } = body;
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'roles')
      .select([
        'user.id',
        'user.username',
        'profile.id',
        'profile.gender',
        'profile.photo',
        'profile.address',
        'roles.id',
        'roles.name',
      ]);

    if (gender) {
      query.andWhere('profile.gender = :gender', { gender });
    }
    if (role) {
      query.andWhere('user.role = :role', { role });
    }
    if (sort) {
      query.orderBy('user.id', sort === 'ASC' ? 'ASC' : 'DESC');
    }

    try {
      const [data, total] = await query
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      // 对查出来的数据进行重命名处理
      const result = data.map((item) => {
        if (item.profile) {
          const { profile, ...user } = item;
          return {
            ...user,
            profile,
          };
        }
        return item;
      });

      return {
        message: '查询成功',
        data: result,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error(error, 'users:Service:findAll:catch');
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '查询用户失败',
        data: [],
      };
    }
  }

  async findOne(id: number): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id },
        relations: ['profile', 'roles'],
      });
    } catch (error) {
      return null;
    }
  }

  // 通过用户id+密码返回用户信息
  async findOneByUserNameAndPassword(userName: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username: userName },
      relations: ['profile', 'roles'],
      select: {
        id: true,
        username: true,
        password: true,
      },
    });
    if (user && (await compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile', 'roles'],
    });
    if (!user) {
      return {
        code: HttpStatus.NOT_FOUND,
        message: '用户不存在',
      };
    }

    // 处理角色关联
    if (updateUserDto.roles && updateUserDto.roles.length > 0) {
      const roleIds = updateUserDto.roles.map((role: { id: number } | number) =>
        typeof role === 'object' ? role.id : role,
      );
      const roles = await this.roleRepository.findBy({ id: In(roleIds) });
      user.roles = roles;
    }

    // 使用 merge 合并主表字段
    this.userRepository.merge(user, updateUserDto);

    // 合并 profile
    if (updateUserDto.profile) {
      this.userRepository.merge(user, { profile: updateUserDto.profile });
    }

    await this.userRepository.save(user); // 级联保存

    return {
      code: 0,
      message: '更新成功',
    };
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) {
      return {
        code: HttpStatus.NOT_FOUND,
        message: '用户不存在',
      };
    }

    // 先解除用户与角色的关联
    user.roles = [];
    await this.userRepository.save(user);

    // 再删除用户
    await this.userRepository.remove(user);
    return {
      code: 0,
      message: '删除成功',
    };
  }
}
