import type { Opt } from "@mikro-orm/core";
import { Entity, Index, Property, Unique } from "@mikro-orm/decorators/legacy";
import { BaseEntity, SoftDeleteEntity } from "@/database/base.entity";

export const SURVEY_STATUS = ["draft", "published", "closed"] as const;
export type SurveyStatus = (typeof SURVEY_STATUS)[number];
export const QUESTION_TYPES = ["single", "multiple", "text", "number"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** 问卷结构：Survey -> SurveyQuestion -> SurveyOption。 */
@Entity({ tableName: "surveys" })
@Index({ name: "idx_surveys_creator_status", properties: ["createdById", "status"] })
@Index({ name: "idx_surveys_status_created", properties: ["status", "createdAt"] })
export class Survey extends SoftDeleteEntity {
  // createdById 只保存创建者关联 ID，不建立物理外键；Service 会验证创建者权限。
  @Property({ fieldName: "created_by_id", type: "uuid" })
  createdById!: string;

  @Property({ length: 200 })
  title!: string;

  @Property({ type: "text", nullable: true })
  description: string | null = null;

  @Property({ length: 20 })
  status: Opt<SurveyStatus> = "draft";

  @Property({ fieldName: "published_at", type: "timestamptz", nullable: true })
  publishedAt: Date | null = null;

  @Property({ fieldName: "closed_at", type: "timestamptz", nullable: true })
  closedAt: Date | null = null;
}

@Entity({ tableName: "survey_questions" })
@Index({ name: "idx_survey_questions_survey_sort", properties: ["surveyId", "sortOrder"] })
export class SurveyQuestion extends SoftDeleteEntity {
  @Property({ fieldName: "survey_id", type: "uuid" })
  surveyId!: string;

  @Property({ length: 20 })
  type!: QuestionType;

  @Property({ type: "text" })
  title!: string;

  @Property()
  required: Opt<boolean> = true;

  @Property({ fieldName: "sort_order" })
  sortOrder: Opt<number> = 0;
}

@Entity({ tableName: "survey_options" })
@Index({ name: "idx_survey_options_question_sort", properties: ["questionId", "sortOrder"] })
export class SurveyOption extends SoftDeleteEntity {
  @Property({ fieldName: "question_id", type: "uuid" })
  questionId!: string;

  @Property({ type: "text" })
  label!: string;

  @Property({ fieldName: "sort_order" })
  sortOrder: Opt<number> = 0;
}

@Entity({ tableName: "survey_responses" })
@Unique({ name: "uq_survey_responses_user", properties: ["surveyId", "userId"] })
@Index({ name: "idx_survey_responses_survey_created", properties: ["surveyId", "createdAt"] })
@Index({ name: "idx_survey_responses_user_created", properties: ["userId", "createdAt"] })
export class SurveyResponse extends BaseEntity {
  // 唯一约束保证同一用户对同一问卷只能提交一次。
  @Property({ fieldName: "survey_id", type: "uuid" })
  surveyId!: string;

  @Property({ fieldName: "user_id", type: "uuid" })
  userId!: string;

  @Property({ fieldName: "submitted_at", type: "timestamptz" })
  submittedAt: Opt<Date> = new Date();
}

@Entity({ tableName: "survey_answers" })
@Unique({ name: "uq_survey_answers_question", properties: ["responseId", "questionId"] })
@Index({ name: "idx_survey_answers_question", properties: ["questionId"] })
export class SurveyAnswer extends BaseEntity {
  // optionIds 使用 JSONB，因为单选/多选答案数量可变；统计查询会用 JSONB 运算符。
  @Property({ fieldName: "response_id", type: "uuid" })
  responseId!: string;

  @Property({ fieldName: "question_id", type: "uuid" })
  questionId!: string;

  @Property({ fieldName: "option_ids", type: "jsonb" })
  optionIds: Opt<string[]> = [];

  @Property({ fieldName: "text_value", type: "text", nullable: true })
  textValue: string | null = null;

  @Property({ fieldName: "number_value", type: "double", nullable: true })
  numberValue: number | null = null;
}
