import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import {
  CreateProfileDto,
  UpdateProfileDto,
  FindAllProfileDto,
} from './dto/profile.dto';
import { QueryBuilderFactory, QueryBuilderHelper } from '@/common';

@Injectable()
export class ProfileService {
  private profileQueryBuilder: QueryBuilderHelper<Profile>;

  constructor(
    @InjectRepository(Profile)
    private readonly proFileRepository: Repository<Profile>,
    private readonly queryBuilderFactory: QueryBuilderFactory,
  ) {
    this.profileQueryBuilder = this.queryBuilderFactory.createFromRepository(
      this.proFileRepository,
    );
  }

  /**
   * 根据ID查询Profile
   */
  async findOne(id: number) {
    return await this.profileQueryBuilder.findOne({
      conditions: [
        {
          field: 'id',
          operator: 'eq',
          value: id,
        },
      ],
    });
  }

  /**
   * 分页查询Profile列表
   */
  async findAll(data: FindAllProfileDto) {
    const { page = 1, pageSize = 10, sort = 'DESC', gender } = data;

    // 构建查询条件
    const conditions = [];
    if (gender !== undefined) {
      conditions.push({
        field: 'gender',
        operator: 'eq',
        value: gender,
      });
    }

    return await this.profileQueryBuilder.findPaginated(
      {
        conditions,
        orderBy: [
          {
            field: 'created_at',
            direction: sort.toUpperCase() as 'ASC' | 'DESC',
          },
        ],
      },
      page,
      pageSize,
    );
  }

  /**
   * 根据{userId || phone }判断是否已经存在记录
   */
  async checkProfileExist(data: {
    userId?: number | null;
    phone?: number | null;
  }) {
    const { userId, phone } = data;
    if (!userId && !phone) {
      return null;
    }

    // 构建OR条件
    const conditions = [];
    if (phone) {
      conditions.push({
        field: 'phone',
        operator: 'eq',
        value: phone,
        or: true,
      });
    }
    if (userId) {
      conditions.push({
        field: 'user_id',
        operator: 'eq',
        value: userId,
        or: true,
      });
    }

    return await this.profileQueryBuilder.findOne({
      conditions,
    });
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
