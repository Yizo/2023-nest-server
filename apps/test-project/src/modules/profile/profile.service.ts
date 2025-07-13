import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';

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
        relations: ['user'],
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
}
