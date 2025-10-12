import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RoleStatus {
  Disabled = 0,
  Enabled = 1,
}

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, comment: '角色名称' })
  name: string;

  @Column({ type: 'int', unique: true, comment: '角色标识' })
  code: number;

  @Column({ type: 'int', comment: '角色状态, 0: 禁用, 1: 启用' })
  status: RoleStatus;

  @Column({ type: 'varchar', comment: '角色描述' })
  description: string;

  @DeleteDateColumn({ type: 'datetime', nullable: true, comment: '软删除时间' })
  deleted_at: Date | null;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间, 自动生成' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', comment: '更新时间, 自动更新' })
  updated_at: Date;
}
