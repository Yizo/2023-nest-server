import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

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
  @OneToOne(() => User)
  // 指定关联关系字段: 默认为[user + Id]
  @JoinColumn()
  user: User;
}
