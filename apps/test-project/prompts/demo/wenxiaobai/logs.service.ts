// ===== Logs Service =====
// src/modules/logs/services/logs.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, IsNull } from 'typeorm';
import { Log } from '../entities/log.entity';
import { User } from '../../user/entities/user.entity';

/**
 * 操作日志服务
 * 负责操作日志的查询和管理
 */
@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 查询操作日志列表
   * @param options 查询选项
   * @param options.page 页码
   * @param options.limit 每页数量
   * @param options.sortBy 排序字段
   * @param options.sortOrder 排序方向
   * @param options.keyword 关键词模糊搜索
   * @param options.module 模块筛选
   * @param options.action 动作筛选
   * @param options.userId 用户ID筛选
   * @param options.startDate 开始时间
   * @param options.endDate 结束时间
   * @param options.result 结果筛选
   * @returns 日志列表和分页信息
   */
  async findLogs(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    keyword?: string;
    module?: string;
    action?: string;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    result?: number;
  }): Promise<{ logs: Log[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      keyword,
      module,
      action,
      userId,
      startDate,
      endDate,
      result,
    } = options;

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect(
        User,
        'user',
        'user.id = log.user_id AND user.deleted_at IS NULL',
      )
      .select(['log.*', 'user.username', 'user.email']);

    // 条件查询
    if (module) {
      queryBuilder.andWhere('log.module = :module', { module });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (userId) {
      queryBuilder.andWhere('log.user_id = :userId', { userId });
    }

    if (result !== undefined) {
      queryBuilder.andWhere('log.result = :result', { result });
    }

    // 时间范围查询
    if (startDate && endDate) {
      queryBuilder.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('log.created_at >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('log.created_at <= :endDate', { endDate });
    }

    // 模糊查询
    if (keyword) {
      queryBuilder.andWhere(
        '(log.details LIKE :keyword OR user.username LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序和分页
    const [logs, total] = await Promise.all([
      queryBuilder
        .orderBy(`log.${sortBy}`, sortOrder)
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany(),
      queryBuilder.getCount(),
    ]);

    return { logs, total };
  }

  /**
   * 根据ID查询日志详情
   * @param id 日志ID
   * @returns 日志详情对象
   */
  async findLogById(id: number): Promise<Log & { user?: User }> {
    const log = await this.logRepository.findOne({ where: { id } });

    if (!log) {
      throw new NotFoundException(`日志不存在 (ID: ${id})`);
    }

    const user = await this.userRepository.findOne({
      where: { id: log.user_id, deleted_at: IsNull() },
    });

    return { ...log, user };
  }

  /**
   * 清理过期日志
   * @param days 保留天数
   * @returns 清理结果
   */
  async cleanupOldLogs(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.logRepository
      .createQueryBuilder()
      .delete()
      .from(Log)
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected;
  }
}
