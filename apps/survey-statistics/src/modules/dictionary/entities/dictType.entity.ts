import {
	Column,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	CreateDateColumn,
	OneToMany,
} from "typeorm";

import { DictData } from "./dictData.entity";

@Entity()
export class DictType {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({
		comment: "字典类型名称",
	})
	name!: string;

	@Column({
		comment: "类型状态, 0: 禁用, 1: 启用",
		default: 1,
	})
	status!: number;

	@Column({
		comment: "字典类型描述",
		default: "",
	})
	description?: string;

	@CreateDateColumn({
		comment: "创建时间",
	})
	createdAt!: Date;

	@UpdateDateColumn({
		comment: "更新时间",
	})
	updatedAt!: Date;

	@OneToMany(() => DictData, (dictData) => dictData.type)
	data!: DictData[];
}
