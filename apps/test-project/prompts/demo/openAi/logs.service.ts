// ===== logs.service.ts =====
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Log } from './logs.entity';

/**
 * LogsService
 *
 * 责任：
 * - 提供查询日志的功能（支持分页、排序、条件、模糊）
 * - 尽量保持写日志的逻辑在各业务服务中完成（以便记录更丰富的上下文），此 Service 更专注于读取/导出/审计查询
 */
@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log) private readonly logRepo: Repository<Log>,
  ) {}

  /**
   * findLogs - 查询日志
   *
   * 支持：
   * - page/pageSize
   * - sortBy/sortDir
   * - filters: user_id, target_table, action
   * - keyword（message 模糊搜索）
   *
   * @param options { page?: number, pageSize?: number, sortBy?: string, sortDir?: 'ASC'|'DESC', filters?: { user_id?, target_table?, action? }, keyword?: string }
   * @returns { Promise<{ rows: Log[]; total: number }> }
   */
  async findLogs(options: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
    filters?: { user_id?: number; target_table?: string; action?: string };
    keyword?: string;
  }): Promise<{ rows: Log[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortDir = 'DESC',
      filters = {},
      keyword,
    } = options;
    const qb = this.logRepo.createQueryBuilder('l');

    if (filters.user_id)
      qb.andWhere('l.user_id = :user_id', { user_id: filters.user_id });
    if (filters.target_table)
      qb.andWhere('l.target_table = :target_table', {
        target_table: filters.target_table,
      });
    if (filters.action)
      qb.andWhere('l.action = :action', { action: filters.action });
    if (keyword) qb.andWhere('l.message LIKE :kw', { kw: `%${keyword}%` });

    qb.orderBy(`l.${sortBy}`, sortDir as any)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
