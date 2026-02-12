import {
	Column,
	Entity,
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { DictType } from "./dictType.entity";

@Entity()
export class DictData {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({
		comment: "字典名称",
	})
	name!: string;

	@Column({
		comment: "字典值",
	})
	value!: string;

	@Column({
		comment: "字典状态, 0: 禁用, 1: 启用",
		default: 1,
	})
	status!: number;

	@Column({
		comment: "排序, 越小越靠前",
		default: 0,
	})
	sortOrder!: number;

	@CreateDateColumn({
		comment: "创建时间",
	})
	createdAt!: Date;

	@UpdateDateColumn({
		comment: "更新时间",
	})
	updatedAt!: Date;

	@ManyToOne(() => DictType, (dictType) => dictType.data, {
		createForeignKeyConstraints: false,
	})
	@JoinColumn({ name: "typeId", referencedColumnName: "id" })
	type!: DictType;
}
