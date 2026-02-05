import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("survey_responses")
export class SurveyResponse {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column()
	surveyId!: string;

	@Column()
	userId!: string;

	@Column({ type: "json" })
	answers!: Record<string, any>;

	@Column({ nullable: true })
	metadata?: string;

	@CreateDateColumn()
	createdAt!: Date;
}
