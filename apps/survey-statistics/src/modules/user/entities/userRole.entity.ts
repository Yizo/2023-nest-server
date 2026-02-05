import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import { Role } from "@/modules/role/role.entity";

@Entity()
export class UserRole {
	@PrimaryGeneratedColumn()
	id!: number;

	// createForeignKeyConstraints: false不创建外键. 写在多的一方
	@ManyToOne(() => User, (user) => user.userRoles, { createForeignKeyConstraints: false })
	/**
	 * name: 中间表列表
	 * referencedColumnName: 关联的主表列名
	 */
	@JoinColumn({ name: "userId", referencedColumnName: "id" })
	user!: User;

	@ManyToOne(() => Role, (role) => role.userRoles, { createForeignKeyConstraints: false })
	@JoinColumn({ name: "roleId", referencedColumnName: "id" })
	role!: Role;
}
