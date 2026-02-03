import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	DeleteDateColumn,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from "typeorm";
import { UserRole } from "@/modules/user/userRole.entity";

@Entity()
export class Role {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column()
	name!: string;

	@Column()
	code!: string;

	@Column({ nullable: true })
	description?: string;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	@DeleteDateColumn({
		nullable: true,
	})
	deletedAt!: Date;

	@OneToMany(() => UserRole, (userRole) => userRole.role)
	userRoles!: UserRole[];
}
