import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';

import { User } from '@/modules/user/entities/user.entity';

export enum RoleStatus {
  Disabled = 0,
  Enabled = 1,
}

export enum RoleType {
  User = 0, // 普通用户
  Admin = 1, // 管理员
  SuperAdmin = 99, // 超级管理员
}

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, comment: '角色名称' })
  name: string;

  @Column({
    type: 'int',
    comment: '角色标识, 0: 普通用户, 1: 管理员, 99: 超级管理员',
    default: RoleType.User,
  })
  code: RoleType;

  @Column({
    type: 'int',
    comment: '角色状态, 0: 禁用, 1: 启用',
    default: RoleStatus.Enabled,
  })
  status: RoleStatus;

  @Column({ type: 'varchar', comment: '角色描述', nullable: true, default: '' })
  description: string;

  @DeleteDateColumn({ type: 'datetime', nullable: true, comment: '软删除时间' })
  deleted_at: Date | null;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间, 自动生成' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', comment: '更新时间, 自动更新' })
  updated_at: Date;

  @ManyToMany(() => User, (user) => user.roles, {
    createForeignKeyConstraints: false,
  })
  users: User[];
}
