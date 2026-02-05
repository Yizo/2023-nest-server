import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

import { SystemConfigType } from "@/enums/system";

@Entity()
export class System {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({
		unique: true,
		comment: "配置标识, 枚举 SystemKey",
		type: "varchar",
		length: 64,
		enum: SystemConfigType,
	})
	key!: SystemConfigType;

	@Column({
		type: "json",
		comment: "配置值，支持对象/字符串/布尔/数字",
	})
	value!: any;
}
