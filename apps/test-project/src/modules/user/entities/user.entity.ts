import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Logs } from '@/modules/logs/logs.entity';
import { Role } from '@/modules/roles/roles.entity';
import { Profile } from '@/modules/profile/entities/profile.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  // 一个用户多个日志
  @OneToMany(() => Logs, (logs) => logs.user)
  logs: Logs[];

  @ManyToMany(() => Role, (roles) => roles.users)
  // 多对多关系，指定中间表名， 只需在主控方使用 @JoinTable
  @JoinTable({ name: 'users_roles' })
  roles: Role[];

  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,
  })
  profile: Profile;
}
