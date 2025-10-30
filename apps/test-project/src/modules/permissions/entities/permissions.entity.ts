import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { Role } from '@/modules/roles/entities/roles.entity';
import { PermissionType } from '@/enums/permission.enum';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, comment: '权限标识' })
  code: string;

  @Column({ type: 'varchar', comment: '权限名称' })
  name: string;

  @Column({
    type: 'int',
    comment: '权限类型, 1: 菜单, 2: 按钮, 3: API, 4: 数据',
  })
  type: PermissionType;

  @Column({ type: 'varchar', comment: '权限描述', nullable: true, default: '' })
  description: string;

  @Column({ type: 'varchar', comment: 'API路径', nullable: true })
  apiPath: string;

  @Column({ type: 'varchar', comment: '请求方法', nullable: true })
  method: string;

  @Column({
    type: 'int',
    comment: '状态, 0: 禁用, 1: 启用',
    default: 1,
  })
  status: number;

  @DeleteDateColumn({ type: 'datetime', nullable: true, comment: '软删除时间' })
  deleted_at: Date | null;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间, 自动生成' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', comment: '更新时间, 自动更新' })
  updated_at: Date;

  @ManyToMany(() => Role, (role) => role.permissions, {
    createForeignKeyConstraints: false,
  })
  @JoinTable({
    name: 'role_permission',
    joinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];
}
