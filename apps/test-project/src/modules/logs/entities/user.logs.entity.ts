import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum LogType {
  Create = 0,
  Update = 1,
  Delete = 2,
}

export enum LogResult {
  Success = 0,
  Failed = 1,
}

@Entity()
export class Logs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true, comment: '操作的用户ID' })
  user_id: number;

  @Column({ type: 'int', comment: '日志类型, 0: 创建, 1: 更新, 2: 删除' })
  type: LogType;

  @Column({ type: 'int', comment: '操作结果, 0: 成功, 1: 失败' })
  result: LogResult;

  @Column({ type: 'varchar', comment: '失败信息' })
  error_message: string;

  @Column({ type: 'json', comment: '操作的实体数据' })
  data: Record<string, any> | null;

  @Column({ type: 'varchar', comment: '操作时ip地址' })
  ip: string;

  @Column({ type: 'varchar', comment: '操作的目标, 如用户、角色、权限等' })
  target: string;

  @Column({ type: 'datetime', comment: '创建时间' })
  created_at: Date;
}
