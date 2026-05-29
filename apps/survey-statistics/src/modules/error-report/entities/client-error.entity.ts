import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { MonitorContext } from "../dto/monitor-context";
import { MonitorEventType } from "../dto/monitor-event-type";
import { MonitorBizSystem } from "./monitor-biz-system.entity";

/** 监控日志表 */
@Entity("client_errors")
@Index("idx_client_errors_system_id", ["systemId"])
@Index("idx_client_errors_app_id", ["appId"])
export class ClientError {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "varchar", length: 32 })
	type!: MonitorEventType;

	@Column({ type: "text" })
	message!: string;

	@Column({ type: "bigint", comment: "事件发生时间戳（毫秒）" })
	timestamp!: string;

	@Column({ type: "varchar", length: 2048, nullable: true })
	url?: string;

	@Column({ type: "text", nullable: true })
	stack?: string;

	@Column({ type: "json", nullable: true })
	tags?: Record<string, string>;

	@Column({ type: "json", nullable: true })
	extra?: Record<string, unknown>;

	/** 关联 monitor_biz_systems.id */
	@Column({ type: "int", nullable: true, comment: "业务系统 ID" })
	systemId?: number;

	@ManyToOne(() => MonitorBizSystem, { nullable: true })
	@JoinColumn({ name: "systemId" })
	system?: MonitorBizSystem;

	/** 应用标识（与 monitor_biz_systems.appId 一致，冗余便于检索） */
	@Column({ type: "varchar", length: 128 })
	appId!: string;

	@Column({ type: "varchar", length: 128, nullable: true })
	release?: string;

	@Column({ type: "json", nullable: true })
	context?: MonitorContext;

	/** 浏览器 User-Agent，服务端从请求头自动读取，前端不传 */
	@Column({ type: "varchar", length: 512, nullable: true })
	userAgent?: string;

	/** 客户端 IP，服务端从 req.ip 自动读取，前端不传 */
	@Column({ type: "varchar", length: 64, nullable: true })
	ip?: string;

	@CreateDateColumn()
	createdAt!: Date;
}
