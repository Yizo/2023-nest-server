import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum UserStatus {
  Disabled = 0,
  Enabled = 1,
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: '用户登录名' })
  @Index()
  username: string;

  @Column({
    select: false,
    type: 'varchar',
    length: 255,
    comment: '用户密码, 加密存储',
  })
  password: string;

  @Column({ type: 'int', default: 1, comment: '用户状态, 0: 禁用, 1: 启用' })
  status: UserStatus;

  /**
   * 软删除时间
   * 关联逻辑：删除用户时需要同步软删除关联的Profile和Logs
   *  */
  @DeleteDateColumn({ type: 'datetime', nullable: true, comment: '软删除时间' })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间, 自动生成' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', comment: '更新时间, 自动更新' })
  updatedAt: Date;
}
