import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import {
  CreateProfileDto,
  UpdateProfileDto,
  FindAllProfileDto,
} from './dto/profile.dto';
import { paginate } from '@/common';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly proFileRepository: Repository<Profile>,
  ) {}

  async findOne(id: number) {
    const profile = await this.proFileRepository.findOne({
      where: { id },
      select: [
        'id',
        'gender',
        'phone',
        'email',
        'address',
        'avatar',
        'created_at',
        'updated_at',
      ],
    });
    return profile;
  }

  async findAll(data: FindAllProfileDto) {
    const { page, pageSize, sort, gender } = data;
    const query = this.proFileRepository.createQueryBuilder('profile');
    if (gender) {
      query.where('profile.gender = :gender', { gender });
    }
    if (sort) {
      query.orderBy('profile.created_at', sort);
    }
    query.select([
      'profile.id',
      'profile.gender',
      'profile.phone',
      'profile.email',
      'profile.address',
      'profile.avatar',
      'profile.created_at',
      'profile.updated_at',
    ]);
    return await paginate<Profile>(query, page, pageSize);
  }

  /**
   * 根据{userId || phone }判断是否已经存在记录
   */
  async checkProfileExist(data: {
    userId?: number | null;
    phone?: number | null;
  }) {
    if (!data.userId && !data.phone) {
      return null;
    }
    const query = this.proFileRepository.createQueryBuilder('profile');
    const { userId, phone } = data;
    if (phone) {
      query.orWhere('profile.phone = :phone', { phone });
    }
    if (userId) {
      query.orWhere('profile.user_id = :userId', { userId });
    }
    return query.getOne();
  }

  async createProfile(createProfileDto: CreateProfileDto) {
    const { userId, phone, ...rest } = createProfileDto;
    const existProfile = await this.checkProfileExist({ userId, phone });
    if (existProfile) {
      throw new BadRequestException('手机号或用户ID已存在');
    }
    console.log('existProfile', existProfile);
    const newProfile = this.proFileRepository.create({
      user_id: userId,
      phone: phone ?? null,
      ...rest,
    });
    const saved = await this.proFileRepository.save(newProfile);
    Reflect.deleteProperty(saved, 'deleted_at');
    return saved;
  }

  async updateProfile(updateProfileDto: UpdateProfileDto) {
    const profile = await this.findOne(updateProfileDto.id);
    if (!profile) {
      throw new BadRequestException('用户资料不存在');
    }

    const existProfile = await this.checkProfileExist({
      phone: updateProfileDto.phone,
    });
    if (existProfile) {
      throw new BadRequestException('手机号已存在');
    }
    return this.proFileRepository.update(updateProfileDto.id, updateProfileDto);
  }
}
