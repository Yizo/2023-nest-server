import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', comment: '关联的用户ID' })
  user_id: number;

  @Column({ type: 'bigint', comment: '关联的角色ID' })
  role_id: number;

  @CreateDateColumn({ type: 'datetime', comment: '创建时间, 自动生成' })
  created_at: Date;
}
