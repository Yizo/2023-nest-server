import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Role } from '@/modules/roles/entities/roles.entity';
import { Permission } from '@/modules/permissions/entities/permissions.entity';
import { PolicyEffect, PolicyAction } from '@/enums';

@Entity()
export class Policy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', comment: '策略名称' })
  name: string;

  @Column({ type: 'varchar', comment: '允许can 拒绝cannot' })
  effect: PolicyEffect;

  @Column({ type: 'varchar', comment: '操作, 如增删改查' })
  action: PolicyAction;

  @Column({ type: 'varchar', comment: '操作主体' })
  subject: string;

  @Column({ type: 'varchar', comment: '限制访问的字段' })
  fields: string;

  @Column({ type: 'varchar', comment: '限制条件' })
  conditions: string;

  @Column({ type: 'varchar', comment: '限制条件为函数时的参数' })
  args: string;

  //   @Column({ type: 'json', comment: '角色' })
  //   roles: Role[];

  //   @Column()
  //   permissions: Permission[];
}
