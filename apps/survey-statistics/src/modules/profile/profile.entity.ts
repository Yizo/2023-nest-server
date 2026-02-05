import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { User } from "@/modules/user/entities/user.entity";

@Entity()
export class Profile {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column()
	bio!: string;

	@OneToOne(() => User, (user) => user.profile)
	@JoinColumn({ name: "userId" })
	user!: User;
}
