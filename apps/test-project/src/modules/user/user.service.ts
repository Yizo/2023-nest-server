import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FindAllBodyDto } from './dto/user-dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: Logger,
  ) {}
  async create(createUserDto: any) {
    const user = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (user) {
      return {
        code: 1,
        message: '用户名已存在',
      };
    } else {
      const newUser = this.userRepository.create(createUserDto);
      return this.userRepository.save(newUser);
    }
  }

  async findAll(body: FindAllBodyDto) {
    const { page = 1, pageSize = 10, sort = 'ASC', gender, role } = body;
    const query = this.userRepository.createQueryBuilder('user');
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
      return {
        message: '查询成功',
        data,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error('查询用户失败', error);
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
        profileId: profile.id,
        sex: profile.gender,
        avatar: profile.photo,
        location: profile.address,
      };
    }
    if (data) {
      const { profile, ...user } = data;
      return { ...user };
    }
    return null;
  }

  async update(id: number, updateUserDto: any) {
    return this.userRepository.update(id, updateUserDto);
  }

  remove(id: number) {
    return this.userRepository.delete(id);
  }
}
