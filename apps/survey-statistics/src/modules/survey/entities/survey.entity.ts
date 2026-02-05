import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

export type SurveyQuestion = {
	id: string;
	text: string;
	type: "single" | "multiple" | "text";
	options?: string[];
};

@Entity("surveys")
export class Survey {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column()
	title!: string;

	@Column({ nullable: true, type: "text" })
	description?: string;

	@Column()
	ownerId!: string;

	@Column({ default: "draft" })
	status!: string;

	@Column({ type: "json", nullable: true })
	questions!: SurveyQuestion[];

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
