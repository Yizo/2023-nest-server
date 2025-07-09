import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';

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
}
