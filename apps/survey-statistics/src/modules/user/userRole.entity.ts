import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import { Role } from "@/modules/role/role.entity";

@Entity()
export class UserRole {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => User, (user) => user.userRoles, { createForeignKeyConstraints: false })
	@JoinColumn({ name: "userId" })
	user!: User;

	@ManyToOne(() => Role, (role) => role.userRoles, { createForeignKeyConstraints: false })
	@JoinColumn({ name: "roleId" })
	role!: Role;
}
