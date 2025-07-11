import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Profile } from '../profile/entities/profile.entity';
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
      query.andWhere('user.gender = :gender', { gender });
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

  async findOne(id: number) {
    // 创建一个以user为主表的查询构造器，user是表别名
    const data = await this.userRepository
      .createQueryBuilder('user')
      // 左连接user表的profile字段，profile是连接后的别名
      .leftJoinAndSelect('user.profile', 'profile')
      // 只查指定的字段，避免查出多余数据
      .select([
        'user.id', // 只查user表的id
        'user.username', // 只查user表的username
        'user.password', // 只查user表的password
        'profile.id', // 只查profile表的id
        'profile.gender', // 只查profile表的gender
        'profile.photo', // 只查profile表的photo
        'profile.address', // 只查profile表的address
      ])
      // 查询条件，user表的id等于传入的id
      .where('user.id = :id', { id })
      // 只查一条数据
      .getOne();
    if (data && data.profile) {
      const { profile, ...user } = data;
      // 将profile字段展开并重命名，返回你想要的结构
      return {
        ...user,
        profile,
      };
    }
    if (data) {
      const { profile, ...user } = data;
      return { ...user, profile };
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

    // 合并 profile（要注意先保证 profile 存在）
    if (updateUserDto.profile) {
      await this.profileRepository.save(user.profile);
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
