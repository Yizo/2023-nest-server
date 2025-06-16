import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '@/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const user = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (user) {
      return {
        code: 1,
        msg: '用户名已存在',
      };
    } else {
      const newUser = this.userRepository.create(createUserDto);
      return this.userRepository.save(newUser);
    }
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    const data = await this.userRepository.findOne({ where: { id } });
    if (data) {
      return data;
    }
    return null;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  remove(id: number) {
    return this.userRepository.delete(id);
  }
}
