import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';

@Entity()
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gender: number;

  @Column()
  photo: string;

  @Column()
  address: string;

  // 一对一关联关系, 注入实体User
  @OneToOne(() => User, (user) => user.profile, {
    cascade: true,
    onDelete: 'CASCADE', // 删除用户时，级联删除 Profile
  })
  // 显式声明外键字段名（“多”的一方或一对一主方）
  // 关联字段名 + 关联实体主键名 默认为[user + Id]
  @JoinColumn({ name: 'userId' })
  user: User;
}
