import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum Gender {
  Male = 0,
  Female = 1,
}

@Entity()
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'bigint', comment: '关联的用户ID', nullable: false })
  user_id: number;

  @Column({
    type: 'varchar',
    unique: true,
    comment: '手机号唯一, 可选',
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
    comment: '邮箱唯一，可选',
  })
  email: string | null;

  @Column({
    type: 'varchar',
    comment: '地址, 可选',
    nullable: true,
  })
  address: string | null;

  @Column({
    type: 'varchar',
    comment: '性别, 可选, 0: 男, 1: 女',
    nullable: true,
  })
  gender: Gender | null;

  @Column({
    type: 'varchar',
    comment: '头像, 可选',
    nullable: true,
  })
  avatar: string | null;

  /**
   * 软删除时间
   *  */
  @DeleteDateColumn({ type: 'datetime', nullable: true, comment: '软删除时间' })
  deleted_at: Date | null;

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime', comment: '创建时间, 自动生成' })
  created_at: Date;

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime', comment: '更新时间, 自动更新' })
  updated_at: Date;
}
