import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

/** 业务系统表（appId 由后端生成，前端上报监控数据时使用） */
@Entity("monitor_biz_systems")
export class MonitorBizSystem {
	@PrimaryGeneratedColumn()
	id!: number;

	/** 应用标识，创建时由后端生成，前端上报监控数据时使用 */
	@Column({ type: "varchar", length: 64, unique: true, comment: "应用标识 appId" })
	appId!: string;

	@Column({ type: "varchar", length: 128, comment: "业务系统名称" })
	name!: string;

	@Column({ type: "boolean", default: true, comment: "是否启用" })
	enabled!: boolean;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
