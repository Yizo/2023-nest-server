import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

import { Profile } from '@/modules/profile/entities/profile.entity';
import { Role } from '@/modules/roles/entities/roles.entity';
import { Logs } from '@/modules/logs/entities/user.logs.entity';

export enum UserStatus {
  Disabled = 0,
  Enabled = 1,
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, comment: '用户登录名' })
  @Index({ unique: true })
  username: string;

  @Column({
    select: false,
    type: 'varchar',
    length: 255,
    comment: '用户密码, 加密存储',
  })
  password: string;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '用户状态, 0: 禁用, 1: 启用',
  })
  status: UserStatus;

  /**
   * 软删除时间
   * 关联逻辑：删除用户时需要同步软删除关联的Profile和Logs
   *  */
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
    comment: '软删除时间',
  })
  deleted_at: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    nullable: true,
    comment: '创建时间, 自动生成',
  })
  created_at: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    nullable: true,
    comment: '更新时间, 自动更新',
  })
  updated_at: Date;

  @OneToOne(() => Profile, (profile) => profile.user, {
    createForeignKeyConstraints: false,
  })
  profile: Profile;

  @ManyToMany(() => Role, (role) => role.users, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'user_role',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];

  @OneToMany(() => Logs, (logs) => logs.user, {
    createForeignKeyConstraints: false,
  })
  logs: Logs[];
}
