import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Logs } from '@/logs/logs.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  // 一个用户多个日志
  @OneToMany(() => Logs, (logs) => logs.user)
  logs: Logs[];
}
