import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';

/**
 * Profile 服务层
 * 提供资料查询与恢复能力
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  /**
   * 根据用户 id 查询资料（含软删）
   * @param userId 用户 id
   * @returns Profile 或 null
   */
  async findProfileByUserId(userId: number): Promise<Profile | null> {
    return this.profileRepo
      .createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .getOne();
  }

  /**
   * 恢复被软删的 Profile
   * @param userId 用户 id
   */
  async restoreProfile(userId: number): Promise<void> {
    const profile = await this.profileRepo
      .createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .andWhere('p.deletedAt IS NOT NULL')
      .getOne();
    if (!profile) throw new NotFoundException('未找到被删资料');
    await this.profileRepo
      .createQueryBuilder()
      .update()
      .set({ deletedAt: null })
      .where('id = :id', { id: profile.id })
      .execute();
  }
}
