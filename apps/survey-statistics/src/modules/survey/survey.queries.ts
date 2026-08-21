import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { PageResult } from "@/common/pagination/pagination";
import type { AuthenticatedUser } from "@/common/types/auth.types";
import type { SurveyListQueryDto } from "./survey.dto";

@Injectable()
export class SurveyQueries {
  constructor(private readonly em: EntityManager) {}

  async list(user: AuthenticatedUser, query: SurveyListQueryDto): Promise<PageResult<Record<string, unknown>>> {
    // 这是问卷列表读模型：返回 responseCount，避免 Controller 逐条查询造成 N+1。
    const conditions = ["s.deleted_at is null", "(s.status = 'published' or s.status = 'closed' or s.created_by_id = ?)"];
    const params: unknown[] = [user.id];
    if (query.status) {
      params.push(query.status);
      conditions.push("s.status = ?");
    }
    const where = conditions.join(" and ");
    const connection = this.em.getConnection();
    const countRows = await connection.execute<Array<{ total: string }>>(
      `select count(*)::text as total from surveys s where ${where}`,
      params,
    );
    const offset = (query.page - 1) * query.pageSize;
    const rows = await connection.execute<Array<Record<string, unknown>>>(
      `select s.id, s.title, s.description, s.status, s.created_by_id as "createdById",
              s.published_at as "publishedAt", s.closed_at as "closedAt", s.created_at as "createdAt",
              (select count(*)::int from survey_responses r where r.survey_id = s.id) as "responseCount"
       from surveys s where ${where}
       order by s.created_at desc, s.id desc
       limit ? offset ?`,
      [...params, query.pageSize, offset],
    );
    return { items: rows, page: query.page, pageSize: query.pageSize, total: Number(countRows[0]?.total ?? 0) };
  }

  async statistics(surveyId: string) {
    // 统计使用专用聚合 SQL，不把复杂 group by 强行塞进通用 Repository CRUD。
    const connection = this.em.getConnection();
    const totals = await connection.execute<Array<{ responseCount: number }>>(
      `select count(*)::int as "responseCount" from survey_responses where survey_id = ?`,
      [surveyId],
    );
    const questions = await connection.execute<Array<Record<string, unknown>>>(
      `select q.id, q.title, q.type, q.required, q.sort_order as "sortOrder",
              count(a.id)::int as "answerCount",
              avg(a.number_value) filter (where a.number_value is not null) as "numberAverage"
       from survey_questions q
       left join survey_answers a on a.question_id = q.id
       where q.survey_id = ? and q.deleted_at is null
       group by q.id, q.title, q.type, q.required, q.sort_order
       order by q.sort_order, q.id`,
      [surveyId],
    );
    const optionCounts = await connection.execute<Array<Record<string, unknown>>>(
      `select o.question_id as "questionId", o.id as "optionId", o.label,
              count(a.id)::int as "count"
       from survey_options o
       left join survey_answers a on a.question_id = o.question_id
         and a.option_ids @> jsonb_build_array(o.id::text)
       where o.deleted_at is null
         and exists (select 1 from survey_questions q where q.id = o.question_id and q.survey_id = ? and q.deleted_at is null)
       group by o.question_id, o.id, o.label, o.sort_order
       order by o.question_id, o.sort_order, o.id`,
      [surveyId],
    );
    return { responseCount: totals[0]?.responseCount ?? 0, questions, optionCounts };
  }
}
