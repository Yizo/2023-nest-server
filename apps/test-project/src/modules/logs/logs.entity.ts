import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

@Entity()
export class Logs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  path: string;

  @Column()
  method: string;

  @Column()
  data: string;

  @Column()
  result: number;

  // 多个日志对应着一个用户
  @ManyToOne(() => User, (user) => user.logs)
  @JoinColumn({ name: 'userId' })
  user: User;
}
