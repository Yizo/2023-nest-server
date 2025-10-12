// logs.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logs } from './logs.entity';

/**
 * 操作日志服务 - 管理系统操作记录
 * 包含查询和日志写入功能
 */
@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Logs) private readonly logRepository: Repository<Logs>,
  ) {}

  /**
   * 查询操作日志
   * 支持多条件组合查询与排序
   *
   * @param queryOptions 查询参数对象
   * @returns 查询结果和总数
   */
  private buildLogQuery(queryOptions: {
    userId?: number;
    action?: string;
    startTime?: string;
    endTime?: string;
    ipAddress?: string;
    userAgent?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }) {
    const {
      userId,
      action,
      startTime,
      endTime,
      ipAddress,
      userAgent,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      limit,
      offset,
    } = queryOptions;

    const query = this.logRepository.createQueryBuilder('log');

    // 多条件筛选
    if (userId !== undefined) {
      query.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (startTime) {
      query.andWhere('log.created_at >= :startTime', { startTime });
    }

    if (endTime) {
      query.andWhere('log.created_at <= :endTime', { endTime });
    }

    if (ipAddress) {
      query.andWhere('log.ipAddress LIKE :ipAddress', {
        ipAddress: `%${ipAddress}%`,
      });
    }

    if (userAgent) {
      query.andWhere('log.userAgent LIKE :userAgent', {
        userAgent: `%${userAgent}%`,
      });
    }

    // 排序
    query.addOrderBy(`log.${sortBy}`, sortOrder);

    // 分页
    if (limit !== undefined) {
      query.limit(limit);
      if (offset !== undefined) {
        query.offset(offset);
      }
    }

    return query;
  }

  /**
   * 获取符合查询条件的日志
   *
   * @param queryOptions 查询参数对象
   * @returns 查询结果和总记录数
   */
  async getLogs(queryOptions: {
    userId?: number;
    action?: string;
    startTime?: string;
    endTime?: string;
    ipAddress?: string;
    userAgent?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ data: Logs[]; total: number }> {
    const {
      userId,
      action,
      startTime,
      endTime,
      ipAddress,
      userAgent,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = queryOptions;

    // 构建查询
    const mainQuery = this.buildLogQuery({
      userId,
      action,
      startTime,
      endTime,
      ipAddress,
      userAgent,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    const countQuery = this.buildLogQuery({
      userId,
      action,
      startTime,
      endTime,
      ipAddress,
      userAgent,
    });

    // 执行查询
    const [data, totalCount] = await Promise.all([
      mainQuery.getMany(),
      countQuery.getCount(),
    ]);

    return { data, total: totalCount };
  }

  /**
   * 写入操作日志
   * 供其他服务调用
   *
   * @param log 日志实体
   * @returns 创建的日志对象
   */
  async createLog(log: Partial<Logs>): Promise<Logs> {
    const newLog = this.logRepository.create(log);
    return await this.logRepository.save(newLog);
  }
}
