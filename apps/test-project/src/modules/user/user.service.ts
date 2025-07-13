import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Profile } from '@/modules/profile/entities/profile.entity'; // 引入 Profile 实体
import { FindAllBodyDto, UpdateUserDto } from './dto/user-dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly logger: Logger,
  ) {}
  async create(createUserDto: any) {
    const newUser = this.userRepository.create(createUserDto);
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
      .select([
        'user.id',
        'user.username',
        'user.password',
        'profile.id',
        'profile.gender',
        'profile.photo',
        'profile.address',
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

  async findOne(id: number): Promise<User | null>;
  async findOne(username: string, password: string): Promise<User | null>;
  async findOne(arg1: number | string, arg2?: string): Promise<User | null> {
    if (typeof arg1 === 'number' && arg2 === undefined) {
      // 按 id 查
      return await this.userRepository.findOne({
        where: { id: arg1 },
        relations: ['profile'],
      });
    } else if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      // 按 username + password 查
      return await this.userRepository.findOne({
        where: { username: arg1, password: arg2 },
        relations: ['profile'],
      });
    }
    return null;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!user) {
      return {
        code: HttpStatus.NOT_FOUND,
        message: '用户不存在',
      };
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
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return {
        code: HttpStatus.NOT_FOUND,
        message: '用户不存在',
      };
    }
    await this.userRepository.remove(user);
    return {
      code: 0,
      message: '删除成功',
    };
  }
}
