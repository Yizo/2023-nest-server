import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { Notification, NotificationRecipient, Survey, SurveyAnswer, SurveyOption, SurveyQuestion, SurveyResponse } from "@/database/entities";
import { BackgroundJobsService } from "@/infrastructure/queue/background-jobs.service";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import type { CreateSurveyDto, SubmitSurveyDto, SurveyAnswerInputDto, SurveyQuestionInputDto, UpdateSurveyDto } from "./survey.dto";

@Injectable()
export class SurveyService {
  constructor(private readonly em: EntityManager, private readonly jobs: BackgroundJobsService) {}

  async create(user: AuthenticatedUser, input: CreateSurveyDto): Promise<{ id: string }> {
    // 问卷、问题、选项必须一起提交；事务保证不会出现只有问卷没有问题的半成品。
    this.validateQuestionDefinitions(input.questions);
    return this.em.transactional(async (em) => {
      const survey = em.create(Survey, { createdById: user.id, title: input.title, description: input.description ?? null });
      em.persist(survey);
      this.persistQuestions(em, survey.id, input.questions);
      await em.flush();
      return { id: survey.id };
    });
  }

  async update(user: AuthenticatedUser, surveyId: string, input: UpdateSurveyDto): Promise<void> {
    // 只允许更新草稿。发布后结构不可变，统计结果才能稳定且可审计。
    this.validateQuestionDefinitions(input.questions);
    await this.em.transactional(async (em) => {
      const survey = await em.findOne(Survey, { id: surveyId, deletedAt: null });
      if (!survey) throw new NotFoundException("问卷不存在");
      this.assertOwner(user, survey);
      if (survey.status !== "draft") throw new ConflictException("问卷发布后不能修改结构");
      survey.title = input.title;
      survey.description = input.description ?? null;
      const oldQuestions = await em.find(SurveyQuestion, { surveyId });
      const questionIds = oldQuestions.map((question) => question.id);
      if (questionIds.length) await em.nativeDelete(SurveyOption, { questionId: { $in: questionIds } });
      await em.nativeDelete(SurveyQuestion, { surveyId });
      this.persistQuestions(em, survey.id, input.questions);
      await em.flush();
    });
  }

  async detail(user: AuthenticatedUser, surveyId: string) {
    const survey = await this.em.findOne(Survey, { id: surveyId, deletedAt: null }, {
      fields: ["id", "createdById", "title", "description", "status", "publishedAt", "closedAt", "createdAt"],
    });
    if (!survey) throw new NotFoundException("问卷不存在");
    if (survey.status === "draft" && survey.createdById !== user.id && !user.isPlatformOwner) throw new ForbiddenException("不能查看他人的草稿问卷");
    const questions = await this.em.find(SurveyQuestion, { surveyId, deletedAt: null }, {
      orderBy: { sortOrder: "asc", id: "asc" },
      fields: ["id", "type", "title", "required", "sortOrder"],
    });
    const questionIds = questions.map((question) => question.id);
    const options = questionIds.length
      ? await this.em.find(SurveyOption, { questionId: { $in: questionIds }, deletedAt: null }, { orderBy: { sortOrder: "asc", id: "asc" }, fields: ["id", "questionId", "label", "sortOrder"] })
      : [];
    const optionMap = new Map<string, typeof options>();
    for (const option of options) optionMap.set(option.questionId, [...(optionMap.get(option.questionId) ?? []), option]);
    return { ...survey, questions: questions.map((question) => ({ ...question, options: optionMap.get(question.id) ?? [] })) };
  }

  async publish(user: AuthenticatedUser, surveyId: string): Promise<void> {
    // 发布是状态机跃迁：draft -> published，并记录时间；重复发布会被拒绝。
    await this.em.transactional(async (em) => {
      const survey = await em.findOne(Survey, { id: surveyId, deletedAt: null });
      if (!survey) throw new NotFoundException("问卷不存在");
      this.assertOwner(user, survey);
      if (survey.status !== "draft") throw new ConflictException("只有草稿问卷可以发布");
      const count = await em.count(SurveyQuestion, { surveyId, deletedAt: null });
      if (count === 0) throw new BadRequestException("问卷至少需要一个问题");
      survey.status = "published";
      survey.publishedAt = new Date();
      await em.flush();
    });
  }

  async close(user: AuthenticatedUser, surveyId: string): Promise<void> {
    // 关闭后保留历史答卷，只阻止继续提交，不物理删除问卷。
    const survey = await this.em.findOne(Survey, { id: surveyId, deletedAt: null });
    if (!survey) throw new NotFoundException("问卷不存在");
    this.assertOwner(user, survey);
    if (survey.status !== "published") throw new ConflictException("只有已发布问卷可以关闭");
    survey.status = "closed";
    survey.closedAt = new Date();
    await this.em.flush();
  }

  async submit(user: AuthenticatedUser, surveyId: string, input: SubmitSurveyDto): Promise<{ responseId: string }> {
    // 提交答卷是已经落库的核心记录：先在一个事务中校验问题、写答卷、写待投递通知，
    // 事务成功后才发布 BullMQ 任务。
    try {
      const result = await this.em.transactional(async (em) => {
        const survey = await em.findOne(Survey, { id: surveyId, deletedAt: null });
        if (!survey) throw new NotFoundException("问卷不存在");
        if (survey.status !== "published") throw new ConflictException("问卷当前不可提交");
        if (await em.findOne(SurveyResponse, { surveyId, userId: user.id })) throw new ConflictException("你已经提交过该问卷");
        const questions = await em.find(SurveyQuestion, { surveyId, deletedAt: null });
        const questionMap = new Map(questions.map((question) => [question.id, question]));
        const questionIds = questions.map((question) => question.id);
        const options = questionIds.length ? await em.find(SurveyOption, { questionId: { $in: questionIds }, deletedAt: null }) : [];
        const optionsByQuestion = new Map<string, Set<string>>();
        for (const option of options) {
          const set = optionsByQuestion.get(option.questionId) ?? new Set<string>();
          set.add(option.id);
          optionsByQuestion.set(option.questionId, set);
        }
        // Map 能同时检测重复 questionId，并让后面的必答校验变成 O(1) 查询。
        const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer]));
        if (answerMap.size !== input.answers.length) throw new BadRequestException("同一个问题不能重复回答");
        for (const answer of input.answers) {
          const question = questionMap.get(answer.questionId);
          if (!question) throw new BadRequestException("答案包含不属于该问卷的问题");
          this.validateAnswer(question, answer, optionsByQuestion.get(question.id) ?? new Set());
        }
        for (const question of questions) {
          if (question.required && !answerMap.has(question.id)) throw new BadRequestException(`必答问题未回答：${question.title}`);
        }
        const response = em.create(SurveyResponse, { surveyId, userId: user.id });
        em.persist(response);
        for (const answer of input.answers) {
          em.persist(em.create(SurveyAnswer, {
            responseId: response.id,
            questionId: answer.questionId,
            optionIds: answer.optionIds,
            textValue: answer.textValue ?? null,
            numberValue: answer.numberValue ?? null,
          }));
        }
        let notificationRecipientId: string | null = null;
        // 创建者本人提交时不产生自己的通知；其他人提交才通知问卷创建者。
        if (survey.createdById !== user.id) {
          const notification = em.create(Notification, {
            type: "survey.response.created",
            title: "问卷收到新答卷",
            content: `问卷《${survey.title}》收到一份新答卷`,
            payload: { surveyId: survey.id, responseId: response.id },
          });
          const recipient = em.create(NotificationRecipient, {
            notificationId: notification.id,
            userId: survey.createdById,
          });
          em.persist([notification, recipient]);
          notificationRecipientId = recipient.id;
        }
        await em.flush();
        return { responseId: response.id, notificationRecipientId };
      });
      // 这里故意在事务外投递队列：数据库提交失败时不会留下“已通知”的假象。
      if (result.notificationRecipientId) await this.jobs.notification(result.notificationRecipientId);
      return { responseId: result.responseId };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      if (error instanceof Error && /uq_survey_responses_user|unique/i.test(error.message)) throw new ConflictException("你已经提交过该问卷");
      throw error;
    }
  }

  async assertStatisticsAccess(user: AuthenticatedUser, surveyId: string): Promise<void> {
    const survey = await this.em.findOne(Survey, { id: surveyId, deletedAt: null }, { fields: ["id", "createdById"] });
    if (!survey) throw new NotFoundException("问卷不存在");
    this.assertOwner(user, survey);
  }

  private persistQuestions(em: EntityManager, surveyId: string, questions: SurveyQuestionInputDto[]): void {
    // 问题和选项使用同一个 surveyId/questionId，并由外层事务统一 flush。
    questions.forEach((input, questionIndex) => {
      const question = em.create(SurveyQuestion, { surveyId, type: input.type, title: input.title, required: input.required, sortOrder: questionIndex });
      em.persist(question);
      input.options.forEach((option, optionIndex) => em.persist(em.create(SurveyOption, { questionId: question.id, label: option.label, sortOrder: optionIndex })));
    });
  }

  private validateQuestionDefinitions(questions: SurveyQuestionInputDto[]): void {
    // DTO 只验证字段类型；跨字段规则（题型与选项的关系）属于 Service 业务校验。
    for (const question of questions) {
      const choice = question.type === "single" || question.type === "multiple";
      if (choice && question.options.length < 2) throw new BadRequestException("单选和多选问题至少需要两个选项");
      if (!choice && question.options.length > 0) throw new BadRequestException("文本和数字问题不能配置选项");
    }
  }

  private validateAnswer(question: SurveyQuestion, answer: SurveyAnswerInputDto, validOptions: Set<string>): void {
    // 答案校验必须基于数据库中的问题和选项，不能相信前端传来的 optionId。
    if (question.type === "single" && answer.optionIds.length !== 1) throw new BadRequestException(`${question.title} 必须选择一个选项`);
    if (question.type === "multiple" && answer.optionIds.length === 0 && question.required) throw new BadRequestException(`${question.title} 至少选择一个选项`);
    if ((question.type === "single" || question.type === "multiple") && answer.optionIds.some((id) => !validOptions.has(id))) throw new BadRequestException(`${question.title} 包含无效选项`);
    if (question.type === "text" && question.required && !answer.textValue?.trim()) throw new BadRequestException(`${question.title} 不能为空`);
    if (question.type === "number" && question.required && answer.numberValue === undefined) throw new BadRequestException(`${question.title} 不能为空`);
  }

  private assertOwner(user: AuthenticatedUser, survey: Pick<Survey, "createdById">): void {
    if (!user.isPlatformOwner && survey.createdById !== user.id) throw new ForbiddenException("只有问卷创建者或平台所有者可以执行该操作");
  }
}
