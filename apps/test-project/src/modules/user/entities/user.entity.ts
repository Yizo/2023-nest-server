import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Logs } from '@/modules/logs/logs.entity';
import { Roles } from '@/modules/roles/roles.entity';

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

  @ManyToMany(() => Roles, (roles) => roles.users)
  // 多对多关系，指定中间表名， 只需在主控方使用 @JoinTable
  @JoinTable({ name: 'users_roles' })
  roles: Roles[];
}
