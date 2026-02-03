import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	OneToOne,
	OneToMany,
} from "typeorm";

import { Profile } from "@/modules/profile/profile.entity";
import { UserRole } from "./userRole.entity";

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

	@DeleteDateColumn({
		nullable: true,
	})
	deletedAt!: Date;

	@OneToOne(() => Profile, (profile) => profile.user)
	profile!: Profile;

	@OneToMany(() => UserRole, (userRole) => userRole.user)
	userRoles!: UserRole[];
}
