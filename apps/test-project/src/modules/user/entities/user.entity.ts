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
import { Roles } from '@/modules/roles/roles.entity';
import { Profile } from '@/modules/profile/entities/profile.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
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

  // —— 拥有方：在 User 上声明 @JoinColumn
  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: ['insert', 'update', 'remove'], // 级联插入 & 更新, typeorm会在更新删除前发送sql操作
    eager: true, // 立即加载 profile（可选）
    onDelete: 'CASCADE', // 数据库层面：删除 user 时级联删除 profile
    orphanedRowAction: 'delete', // 断开或删除 user 时，把 profile 当作孤儿删掉
  })
  @JoinColumn({ name: 'profileId' }) // 外键列在 profile 表里，字段名为 profileId
  profile: Profile;
}
