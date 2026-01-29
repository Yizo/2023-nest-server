import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Index({ unique: true })
	@Column({ nullable: false })
	username!: string;

	@Index({ unique: true })
	@Column()
	email!: string;

	@Column()
	password!: string;

	@Column({ default: true })
	isActive!: boolean;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
