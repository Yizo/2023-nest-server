import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logs } from './logs.entity';

/**
 * Logs 服务层
 * 提供日志查询能力
 */
@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Logs)
    private readonly logsRepo: Repository<Logs>,
  ) {}

  /**
   * 查询用户日志（分页、排序、条件）
   * @param dto 查询参数
   * @returns 日志列表与总数
   */
  async findLogs(dto: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    resourceType?: string;
  }): Promise<{ data: Logs[]; total: number }> {
    const { page = 1, limit = 20, userId, action, resourceType } = dto;

    const qb = this.logsRepo
      .createQueryBuilder('l')
      .where('l.deletedAt IS NULL');

    if (userId) qb.andWhere('l.userId = :userId', { userId });
    if (action) qb.andWhere('l.action = :action', { action });
    if (resourceType)
      qb.andWhere('l.resourceType = :resourceType', { resourceType });

    qb.orderBy('l.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
