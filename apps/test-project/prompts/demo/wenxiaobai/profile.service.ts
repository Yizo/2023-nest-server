// ===== Profile Service =====
// src/modules/profile/services/profile.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { User } from '../../user/entities/user.entity';
import { Log } from '../../logs/entities/log.entity';

/**
 * 用户资料服务
 * 负责用户资料相关的业务逻辑处理
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
    private dataSource: DataSource,
  ) {}

  /**
   * 根据用户ID获取资料详情
   * @param userId 用户ID
   * @returns 用户资料对象
   */
  async getProfileByUserId(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    if (!profile) {
      throw new NotFoundException(`用户资料不存在 (用户ID: ${userId})`);
    }

    return profile;
  }

  /**
   * 更新用户资料
   * @param userId 用户ID
   * @param profileData 资料更新数据
   * @param operatorId 操作者用户ID
   * @returns 更新后的资料对象
   */
  async updateProfile(
    userId: number,
    profileData: Partial<Profile>,
    operatorId: number,
  ): Promise<Profile> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证用户存在性
      const user = await this.userRepository.findOne({
        where: { id: userId, deleted_at: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`用户不存在 (ID: ${userId})`);
      }

      // 验证资料存在性
      const existingProfile = await this.profileRepository.findOne({
        where: { user_id: userId, deleted_at: IsNull() },
      });

      if (!existingProfile) {
        throw new NotFoundException(`用户资料不存在 (用户ID: ${userId})`);
      }

      // 更新资料
      await queryRunner.manager.update(
        Profile,
        { user_id: userId },
        { ...profileData, updated_at: new Date() },
      );

      // 记录操作日志
      await this.logProfileAction(
        queryRunner,
        operatorId,
        'update',
        `更新用户资料: ${user.username}`,
        userId,
      );

      await queryRunner.commitTransaction();
      return await this.profileRepository.findOne({
        where: { user_id: userId },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 记录资料操作日志
   * @param queryRunner 查询运行器
   * @param userId 用户ID
   * @param action 操作动作
   * @param details 操作详情
   * @param targetUserId 目标用户ID
   */
  private async logProfileAction(
    queryRunner: any,
    userId: number,
    action: string,
    details: string,
    targetUserId: number,
  ): Promise<void> {
    const log = this.logRepository.create({
      user_id: userId,
      module: 'profile',
      action,
      details: `${details} (目标用户ID: ${targetUserId})`,
      result: 1,
    });

    await queryRunner.manager.save(Log, log);
  }
}
