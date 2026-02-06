import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Permission {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({
		comment: "权限操作: read(读), write(写), delete(删), manage(管理)",
	})
	action!: string;

	@Column({
		comment: "权限描述",
	})
	description?: string;
}
