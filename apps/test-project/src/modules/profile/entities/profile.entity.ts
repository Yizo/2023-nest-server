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
  gender: string;

  @Column()
  photo: string;

  @Column()
  address: string;

  @OneToOne(() => User, (user) => user.profile, {
    onDelete: 'CASCADE', // 删除 User 时级联删除 Profile
    onUpdate: 'CASCADE', // 更新 User 时级联更新 Profile
  })
  @JoinColumn()
  user: User;
}
