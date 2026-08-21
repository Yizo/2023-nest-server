import { Injectable, Logger } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";

export interface IntegrityIssue {
  relation: string;
  orphanCount: number;
}

@Injectable()
export class IntegrityAuditService {
  private readonly logger = new Logger(IntegrityAuditService.name);
  constructor(private readonly em: EntityManager) {}

  async run(): Promise<IntegrityIssue[]> {
    // 当前设计不创建物理外键，因此用巡检 SQL 发现逻辑孤儿记录。
    // 巡检只报告，不自动删除，避免后台任务误删业务数据。
    const rows = await this.em.getConnection().execute<Array<{ relation: string; orphan_count: string }>>(`
      select 'user_profiles.user_id' relation, count(*)::text orphan_count from user_profiles c left join users p on p.id = c.user_id where p.id is null
      union all select 'user_roles.user_id', count(*)::text from user_roles c left join users p on p.id = c.user_id where p.id is null
      union all select 'user_roles.role_id', count(*)::text from user_roles c left join roles p on p.id = c.role_id where p.id is null
      union all select 'role_permissions.role_id', count(*)::text from role_permissions c left join roles p on p.id = c.role_id where p.id is null
      union all select 'role_permissions.permission_id', count(*)::text from role_permissions c left join permissions p on p.id = c.permission_id where p.id is null
      union all select 'dict_items.dict_type_id', count(*)::text from dict_items c left join dict_types p on p.id = c.dict_type_id where p.id is null
      union all select 'menus.parent_id', count(*)::text from menus c left join menus p on p.id = c.parent_id where c.parent_id is not null and p.id is null
      union all select 'menus.permission_id', count(*)::text from menus c left join permissions p on p.id = c.permission_id where c.permission_id is not null and p.id is null
      union all select 'surveys.created_by_id', count(*)::text from surveys c left join users p on p.id = c.created_by_id where p.id is null
      union all select 'survey_questions.survey_id', count(*)::text from survey_questions c left join surveys p on p.id = c.survey_id where p.id is null
      union all select 'survey_options.question_id', count(*)::text from survey_options c left join survey_questions p on p.id = c.question_id where p.id is null
      union all select 'survey_responses.survey_id', count(*)::text from survey_responses c left join surveys p on p.id = c.survey_id where p.id is null
      union all select 'survey_responses.user_id', count(*)::text from survey_responses c left join users p on p.id = c.user_id where p.id is null
      union all select 'survey_answers.response_id', count(*)::text from survey_answers c left join survey_responses p on p.id = c.response_id where p.id is null
      union all select 'survey_answers.question_id', count(*)::text from survey_answers c left join survey_questions p on p.id = c.question_id where p.id is null
      union all select 'client_errors.app_id', count(*)::text from client_errors c left join monitor_apps p on p.id = c.app_id where p.id is null
      union all select 'notification_recipients.notification_id', count(*)::text from notification_recipients c left join notifications p on p.id = c.notification_id where p.id is null
      union all select 'notification_recipients.user_id', count(*)::text from notification_recipients c left join users p on p.id = c.user_id where p.id is null
    `);
    const issues = rows.map((row) => ({ relation: row.relation, orphanCount: Number(row.orphan_count) })).filter((row) => row.orphanCount > 0);
    const log = JSON.stringify({ event: "database_integrity_audit", issues });
    if (issues.length) this.logger.error(log); else this.logger.log(log);
    return issues;
  }
}
