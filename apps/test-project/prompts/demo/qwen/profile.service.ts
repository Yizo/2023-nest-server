// profile.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Profile } from './profile.entity';
import { User } from './user.entity';
import { Logs } from './logs.entity';
import { QueryRunner } from 'typeorm';

/**
 * 用户资料服务 - 管理用户资料相关业务逻辑
 * 包含CRUD操作、关联关系维护和业务校验
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Logs) private readonly logRepository: Repository<Logs>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建用户资料
   * 手动维护用户-资料的关联关系
   *
   * @param profile 用户资料实体
   * @param userId 关联的用户ID
   * @returns 创建的用户资料对象
   */
  async createProfile(
    profile: Partial<Profile>,
    userId: number,
  ): Promise<Profile> {
    // 校验用户是否存在
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 校验该用户是否已有资料
    const existingProfile = await this.profileRepository.findOneBy({ userId });
    if (existingProfile) {
      throw new Error(`Profile for user with ID ${userId} already exists`);
    }

    // 创建用户资料
    const newProfile = this.profileRepository.create({
      ...profile,
      userId,
    });

    const savedProfile = await this.profileRepository.save(newProfile);

    // 记录日志
    await this.logRepository.save({
      userId,
      action: 'create',
      description: `Profile created with ID: ${savedProfile.id}`,
      ipAddress: '127.0.0.1', // 实际使用应从请求中获取
      userAgent: 'Postman', // 实际使用应从请求中获取
    });

    return savedProfile;
  }

  /**
   * 查询用户资料
   * 通过用户ID获取资料
   *
   * @param userId 用户ID
   * @returns 用户资料对象
   */
  async getProfileByUserId(userId: number): Promise<Profile> {
    // 校验用户是否存在
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const profile = await this.profileRepository.findOneBy({ userId });
    if (!profile) {
      throw new Error(`Profile for user with ID ${userId} not found`);
    }

    return profile;
  }

  /**
   * 更新用户资料
   *
   * @param userId 用户ID
   * @param updates 用户资料更新数据
   * @returns 更新后的用户资料对象
   */
  async updateProfile(
    userId: number,
    updates: Partial<Profile>,
  ): Promise<Profile> {
    // 校验资料是否存在
    const existingProfile = await this.profileRepository.findOneBy({ userId });
    if (!existingProfile) {
      throw new Error(`Profile for user with ID ${userId} not found`);
    }

    // 校验用户是否存在
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const result = await this.profileRepository.update(
      { userId },
      {
        ...updates,
        updated_at: new Date(),
      },
    );

    if (result.affected === 0) {
      throw new Error('Failed to update profile');
    }

    // 记录日志
    await this.logRepository.save({
      userId,
      action: 'update',
      description: `Profile updated for user ID: ${userId}`,
      ipAddress: '127.0.0.1', // 实际使用应从请求中获取
      userAgent: 'Postman', // 实际使用应从请求中获取
    });

    // 返回更新后的资料
    return this.profileRepository.findOneBy({ userId });
  }

  /**
   * 软删除用户资料
   *
   * @param userId 用户ID
   * @returns 是否成功
   */
  async softDeleteProfile(userId: number): Promise<boolean> {
    // 校验资料是否存在
    const existingProfile = await this.profileRepository.findOneBy({ userId });
    if (!existingProfile) {
      throw new Error(`Profile for user with ID ${userId} not found`);
    }

    // 校验用户是否存在
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 执行软删除
    const result = await this.profileRepository.update(
      { userId },
      { deleted_at: new Date() },
    );

    if (result.affected === 0) {
      throw new Error('Failed to soft delete profile');
    }

    // 记录日志
    await this.logRepository.save({
      userId,
      action: 'delete',
      description: `Profile soft deleted for user ID: ${userId}`,
      ipAddress: '127.0.0.1', // 实际使用应从请求中获取
      userAgent: 'Postman', // 实际使用应从请求中获取
    });

    return true;
  }

  /**
   * 恢复用户资料
   *
   * @param userId 用户ID
   * @returns 是否成功
   */
  async restoreProfile(userId: number): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 查询被软删除的资料
      const existingProfile = await queryRunner.manager
        .getRepository(Profile)
        .findOne({
          where: { userId },
          withDeleted: true,
        });

      if (!existingProfile) {
        throw new Error(`Profile for user with ID ${userId} not found`);
      }

      // 如果资料未被软删除，则无需操作
      if (!existingProfile.deleted_at) {
        return true;
      }

      // 恢复资料
      await queryRunner.manager.getRepository(Profile).restore({ userId });

      // 记录恢复日志
      await queryRunner.manager.getRepository(Logs).save({
        userId,
        action: 'restore',
        description: `Profile restored for user ID: ${userId}`,
        ipAddress: '127.0.0.1', // 实际使用应从请求中获取
        userAgent: 'Postman', // 实际使用应从请求中获取
      });

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
