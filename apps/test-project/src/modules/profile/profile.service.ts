import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly proFileRepository: Repository<Profile>,
  ) {}

  async findOne(id: number) {
    try {
      const result = await this.proFileRepository.findOne({
        where: {
          id: id,
        },
      });
      console.log(result);
      return result;
    } catch (e) {
      return e.toString();
    }
  }

  async create(createProfileDto: CreateProfileDto) {
    const newProfile = this.proFileRepository.create(createProfileDto);
    await this.proFileRepository.save(newProfile);
    return {
      code: 0,
      message: '新增成功',
    };
  }

  async findAll() {
    const list = await this.proFileRepository.find({ relations: ['user'] });
    return {
      code: 0,
      message: '查询成功',
      data: list,
    };
  }

  async update(id: number, updateProfileDto: UpdateProfileDto) {
    await this.proFileRepository.update(id, updateProfileDto);
    return {
      code: 0,
      message: '更新成功',
    };
  }
}
