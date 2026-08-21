import { Migration } from "@mikro-orm/migrations";

export class Migration20260817000100 extends Migration {
  override async up(): Promise<void> {
    // 这是全新版本的数据库基线。后续版本只能新增 migration，不能修改已执行的基线。
    // 表之间故意不创建物理外键，引用完整性由 Service 校验和 orphan-check 维护。
    this.addSql(`
      -- 身份与 RBAC：用户通过关系表连接动态角色和权限。
      create table "users" (
        -- UUIDv7 主键，按时间大致有序。
        "id" uuid primary key,
        -- 登录邮箱，也是用户唯一业务标识。
        "email" varchar(160) not null,
        -- 展示名称，不参与权限判断。
        "display_name" varchar(80) not null,
        -- Argon2 密码哈希，绝不保存明文密码。
        "password_hash" varchar(255) not null,
        -- active 可以登录，disabled 保留数据但禁止登录。
        "status" varchar(20) not null default 'active' check ("status" in ('active', 'disabled')),
        -- 首个管理员引导标记，不是普通动态角色。
        "is_platform_owner" boolean not null default false,
        -- 最近一次成功登录时间，可用于审计。
        "last_login_at" timestamptz null,
        -- 创建时间，所有基础实体都保留。
        "created_at" timestamptz not null default now(),
        -- 最后更新时间，由 ORM onUpdate 维护。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间，非空时业务查询默认排除。
        "deleted_at" timestamptz null,
        -- 数据库层再次保证邮箱唯一。
        constraint "uq_users_email" unique ("email")
      );
      -- 支持按状态和创建时间管理用户列表。
      create index "idx_users_status_created" on "users" ("status", "created_at");

      -- 用户扩展信息独立出来，避免 users 表不断膨胀。
      create table "user_profiles" (
        -- 扩展记录自己的 UUID。
        "id" uuid primary key,
        -- 逻辑关联用户；没有物理外键。
        "user_id" uuid not null,
        -- 可选手机号。
        "phone" varchar(40) null,
        -- 可选头像地址。
        "avatar" varchar(500) null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 一个用户只能有一条 profile。
        constraint "uq_user_profiles_user" unique ("user_id")
      );

      -- 角色是动态业务数据，不能在代码中写死默认角色。
      create table "roles" (
        -- 角色 UUID。
        "id" uuid primary key,
        -- 稳定的机器编码，例如 respondent。
        "code" varchar(80) not null,
        -- 面向管理员的显示名称。
        "name" varchar(100) not null,
        -- 角色说明。
        "description" varchar(500) null,
        -- 禁用角色后保留历史授权关系。
        "enabled" boolean not null default true,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null,
        -- 角色编码唯一。
        constraint "uq_roles_code" unique ("code")
      );
      -- 列出可用角色时优先过滤 enabled。
      create index "idx_roles_enabled" on "roles" ("enabled");

      -- 权限是代码能力定义，跟随 migration 演进。
      create table "permissions" (
        -- 权限 UUID，稳定引用关系表。
        "id" uuid primary key,
        -- 代码使用的权限字符串。
        "code" varchar(120) not null,
        -- 管理界面显示名称。
        "name" varchar(120) not null,
        -- 用于权限列表分组，不用于判断。
        "group" varchar(40) not null,
        -- 权限说明。
        "description" varchar(500) null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null,
        -- 权限编码唯一。
        constraint "uq_permissions_code" unique ("code")
      );

      -- 用户与角色的多对多关系表。
      create table "user_roles" (
        -- 关系记录 UUID。
        "id" uuid primary key,
        -- 保存 users.id 作为关联 ID，但不建立数据库外键。
        "user_id" uuid not null,
        -- 保存 roles.id 作为关联 ID，但不建立数据库外键。
        "role_id" uuid not null,
        -- 关系创建时间。
        "created_at" timestamptz not null default now(),
        -- 关系更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一用户不能重复绑定同一角色。
        constraint "uq_user_roles_pair" unique ("user_id", "role_id")
      );
      -- 反向按角色查询用户时使用。
      create index "idx_user_roles_role" on "user_roles" ("role_id");

      -- 角色与权限的多对多关系表。
      create table "role_permissions" (
        -- 关系记录 UUID。
        "id" uuid primary key,
        -- 保存 roles.id 作为关联 ID，但不建立数据库外键。
        "role_id" uuid not null,
        -- 保存 permissions.id 作为关联 ID，但不建立数据库外键。
        "permission_id" uuid not null,
        -- 关系创建时间。
        "created_at" timestamptz not null default now(),
        -- 关系更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一角色不能重复绑定同一权限。
        constraint "uq_role_permissions_pair" unique ("role_id", "permission_id")
      );
      -- 反向按权限查询角色时使用。
      create index "idx_role_permissions_permission" on "role_permissions" ("permission_id");

      -- 系统元数据：字典、菜单和可配置的系统值。
      -- 字典类型是字典项的父级编码。
      create table "dict_types" (
        -- 字典类型 UUID。
        "id" uuid primary key,
        -- 机器使用的字典编码。
        "code" varchar(80) not null,
        -- 管理界面显示名称。
        "name" varchar(100) not null,
        -- 禁用后保留历史字典数据。
        "enabled" boolean not null default true,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null,
        -- 字典类型编码唯一。
        constraint "uq_dict_types_code" unique ("code")
      );

      -- 字典类型下的具体可选值。
      create table "dict_items" (
        -- 字典项 UUID。
        "id" uuid primary key,
        -- 保存 dict_types.id 作为关联 ID，但不建立数据库外键。
        "dict_type_id" uuid not null,
        -- 展示标签。
        "label" varchar(100) not null,
        -- 业务实际使用的值。
        "value" varchar(100) not null,
        -- 列表排序。
        "sort_order" integer not null default 0,
        -- 是否参与选择。
        "enabled" boolean not null default true,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null,
        -- 同一字典类型内 value 不能重复。
        constraint "uq_dict_items_type_value" unique ("dict_type_id", "value")
      );
      -- 按字典类型和排序读取字典项。
      create index "idx_dict_items_type_sort" on "dict_items" ("dict_type_id", "sort_order");

      create table "menus" (
        -- 菜单 UUID。
        "id" uuid primary key,
        -- 可选父菜单 UUID，用于构建树。
        "parent_id" uuid null,
        -- 可选关联权限 UUID，控制前端菜单显示。
        "permission_id" uuid null,
        -- 菜单显示名称。
        "name" varchar(100) not null,
        -- 前端路由路径。
        "path" varchar(200) not null,
        -- 同级菜单排序值。
        "sort_order" integer not null default 0,
        -- 是否显示。
        "enabled" boolean not null default true,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null
      );
      -- 按父菜单和排序读取树结构。
      create index "idx_menus_parent_sort" on "menus" ("parent_id", "sort_order");
      -- 按权限反查菜单。
      create index "idx_menus_permission" on "menus" ("permission_id");

      -- 系统配置采用 key/value，便于版本增加配置而不改表结构。
      create table "system_configs" (
        -- 配置 UUID。
        "id" uuid primary key,
        -- 稳定配置键。
        "key" varchar(120) not null,
        -- 原始字符串值。
        "value" text not null,
        -- 读取时解释 value 的类型。
        "value_type" varchar(20) not null default 'string' check ("value_type" in ('string', 'number', 'boolean', 'json')),
        -- 配置用途说明。
        "description" varchar(500) null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null,
        -- 每个配置键只能有一条有效记录。
        constraint "uq_system_configs_key" unique ("key")
      );

      -- 问卷聚合：发布后结构不可变，答卷可以持续写入。
      create table "surveys" (
        -- 问卷 UUID。
        "id" uuid primary key,
        -- 保存 users.id 作为创建者关联 ID，但不建立数据库外键。
        "created_by_id" uuid not null,
        -- 问卷标题。
        "title" varchar(200) not null,
        -- 可选描述。
        "description" text null,
        -- draft/published/closed 状态机。
        "status" varchar(20) not null default 'draft' check ("status" in ('draft', 'published', 'closed')),
        -- 发布时间。
        "published_at" timestamptz null,
        -- 关闭时间。
        "closed_at" timestamptz null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null
      );
      -- 创建者按状态查看自己的问卷。
      create index "idx_surveys_creator_status" on "surveys" ("created_by_id", "status");
      -- 公共列表按状态和创建时间排序。
      create index "idx_surveys_status_created" on "surveys" ("status", "created_at");

      -- 问卷中的问题定义。
      create table "survey_questions" (
        -- 问题 UUID。
        "id" uuid primary key,
        -- 保存 surveys.id 作为关联 ID，但不建立数据库外键。
        "survey_id" uuid not null,
        -- single/multiple/text/number。
        "type" varchar(20) not null check ("type" in ('single', 'multiple', 'text', 'number')),
        -- 问题标题。
        "title" text not null,
        -- 是否必须回答。
        "required" boolean not null default true,
        -- 问题在问卷中的顺序。
        "sort_order" integer not null default 0,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null
      );
      -- 详情和提交校验按问卷顺序读取问题。
      create index "idx_survey_questions_survey_sort" on "survey_questions" ("survey_id", "sort_order");

      -- 单选/多选问题的选项。
      create table "survey_options" (
        -- 选项 UUID。
        "id" uuid primary key,
        -- 保存 survey_questions.id 作为关联 ID，但不建立数据库外键。
        "question_id" uuid not null,
        -- 选项显示文本。
        "label" text not null,
        -- 选项顺序。
        "sort_order" integer not null default 0,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null
      );
      -- 详情读取某问题的选项顺序。
      create index "idx_survey_options_question_sort" on "survey_options" ("question_id", "sort_order");

      create table "survey_responses" (
        -- 答卷 UUID。
        "id" uuid primary key,
        -- 保存 surveys.id 作为关联 ID，但不建立数据库外键。
        "survey_id" uuid not null,
        -- 保存 users.id 作为关联 ID，但不建立数据库外键。
        "user_id" uuid not null,
        -- 实际提交时间。
        "submitted_at" timestamptz not null default now(),
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一用户同一问卷只能提交一次。
        constraint "uq_survey_responses_user" unique ("survey_id", "user_id")
      );
      -- 统计某问卷的答卷数量和时间范围。
      create index "idx_survey_responses_survey_created" on "survey_responses" ("survey_id", "created_at");
      -- 查询某用户历史答卷。
      create index "idx_survey_responses_user_created" on "survey_responses" ("user_id", "created_at");

      -- 一份答卷对每个问题保存一条答案。
      create table "survey_answers" (
        -- 答案 UUID。
        "id" uuid primary key,
        -- 保存 survey_responses.id 作为关联 ID，但不建立数据库外键。
        "response_id" uuid not null,
        -- 保存 survey_questions.id 作为关联 ID，但不建立数据库外键。
        "question_id" uuid not null,
        -- 单选/多选选中的选项 UUID 数组。
        "option_ids" jsonb not null default '[]'::jsonb,
        -- 文本题答案。
        "text_value" text null,
        -- 数字题答案。
        "number_value" double precision null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一答卷同一问题不能重复回答。
        constraint "uq_survey_answers_question" unique ("response_id", "question_id")
      );
      -- 统计按问题聚合答案。
      create index "idx_survey_answers_question" on "survey_answers" ("question_id");

      -- 监控先保存原始错误，Worker 再异步构建聚合分组。
      create table "monitor_apps" (
        -- 监控应用 UUID。
        "id" uuid primary key,
        -- 客户端上报使用的应用编码。
        "code" varchar(80) not null,
        -- 应用显示名称。
        "name" varchar(120) not null,
        -- ingestKey 的 SHA-256，不保存明文凭据。
        "ingest_key_hash" varchar(255) not null,
        -- 禁用后拒绝继续上报。
        "enabled" boolean not null default true,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 软删除时间。
        "deleted_at" timestamptz null,
        -- 应用编码唯一。
        constraint "uq_monitor_apps_code" unique ("code")
      );

      -- 客户端错误原始记录，后续由 Worker 聚合。
      create table "client_errors" (
        -- 错误记录 UUID。
        "id" uuid primary key,
        -- 保存 monitor_apps.id 作为关联 ID，但不建立数据库外键。
        "app_id" uuid not null,
        -- 客户端生成的幂等事件 ID。
        "event_id" varchar(100) not null,
        -- 可选的登录用户 UUID。
        "user_id" uuid null,
        -- message + stack 生成的错误指纹。
        "fingerprint" varchar(64) not null,
        -- 错误消息。
        "message" text not null,
        -- 可选堆栈。
        "stack" text null,
        -- 脱敏后的上下文 JSON。
        "context" jsonb not null default '{}'::jsonb,
        -- 客户端发生时间。
        "occurred_at" timestamptz not null,
        -- null 表示尚未聚合。
        "processed_at" timestamptz null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一应用同一事件只接受一次。
        constraint "uq_client_errors_event" unique ("app_id", "event_id")
      );
      -- 监控应用时间线查询。
      create index "idx_client_errors_app_created" on "client_errors" ("app_id", "created_at");
      -- 按应用和指纹过滤错误。
      create index "idx_client_errors_fingerprint" on "client_errors" ("app_id", "fingerprint");
      -- Worker reconcile 只扫描未处理记录。
      create index "idx_client_errors_unprocessed" on "client_errors" ("processed_at") where "processed_at" is null;

      create table "client_error_groups" (
        -- 聚合分组 UUID。
        "id" uuid primary key,
        -- 保存 monitor_apps.id 作为关联 ID，但不建立数据库外键。
        "app_id" uuid not null,
        -- 分组指纹。
        "fingerprint" varchar(64) not null,
        -- 最近一次错误的示例消息。
        "sample_message" text not null,
        -- 当前指纹累计次数。
        "count" integer not null default 0 check ("count" >= 0),
        -- 首次出现时间。
        "first_seen_at" timestamptz not null,
        -- 最近出现时间。
        "last_seen_at" timestamptz not null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一应用同一指纹只有一个分组。
        constraint "uq_client_error_groups_fingerprint" unique ("app_id", "fingerprint")
      );
      -- 按最近出现时间查看监控分组。
      create index "idx_client_error_groups_last_seen" on "client_error_groups" ("app_id", "last_seen_at");

      -- 通知先作为已落库记录保存，Redis/BullMQ 只负责后续投递动作。
      create table "notifications" (
        -- 通知 UUID。
        "id" uuid primary key,
        -- 稳定的通知类型。
        "type" varchar(80) not null,
        -- 通知标题。
        "title" varchar(200) not null,
        -- 通知正文。
        "content" text not null,
        -- 业务关联数据。
        "payload" jsonb not null default '{}'::jsonb,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now()
      );
      -- 按创建时间读取通知。
      create index "idx_notifications_created" on "notifications" ("created_at");

      -- 通知与用户的收件关系，记录投递和已读状态。
      create table "notification_recipients" (
        -- 收件关系 UUID。
        "id" uuid primary key,
        -- 保存 notifications.id 作为关联 ID，但不建立数据库外键。
        "notification_id" uuid not null,
        -- 保存 users.id 作为关联 ID，但不建立数据库外键。
        "user_id" uuid not null,
        -- pending 等待 Worker 投递，sent 表示已发送实时事件。
        "delivery_status" varchar(20) not null default 'pending' check ("delivery_status" in ('pending', 'sent')),
        -- 实时投递完成时间。
        "delivered_at" timestamptz null,
        -- 用户点击已读的时间。
        "read_at" timestamptz null,
        -- 创建时间。
        "created_at" timestamptz not null default now(),
        -- 更新时间。
        "updated_at" timestamptz not null default now(),
        -- 同一通知不能重复发给同一用户。
        constraint "uq_notification_recipients_pair" unique ("notification_id", "user_id")
      );
      -- 用户通知列表按时间读取。
      create index "idx_notification_recipients_user_created" on "notification_recipients" ("user_id", "created_at");
      -- Worker reconcile 按 pending 状态扫描。
      create index "idx_notification_recipients_pending" on "notification_recipients" ("delivery_status", "created_at");
    `);

    // 权限是稳定的“能力定义”，因此跟随 migration 演进；角色是动态业务数据，不在这里创建。
    // ID 使用固定 UUID，后续 migration 可以稳定引用已有权限。
    const permissions = [
      ["0198b1c0-0000-7000-8000-000000000001", "user.read", "查看用户", "identity"],
      ["0198b1c0-0000-7000-8000-000000000002", "user.create", "创建用户", "identity"],
      ["0198b1c0-0000-7000-8000-000000000003", "user.update", "更新用户", "identity"],
      ["0198b1c0-0000-7000-8000-000000000004", "user.assign-role", "分配角色", "identity"],
      ["0198b1c0-0000-7000-8000-000000000005", "role.read", "查看角色", "identity"],
      ["0198b1c0-0000-7000-8000-000000000006", "role.create", "创建角色", "identity"],
      ["0198b1c0-0000-7000-8000-000000000007", "role.update", "更新角色", "identity"],
      ["0198b1c0-0000-7000-8000-000000000008", "role.assign-permission", "分配权限", "identity"],
      ["0198b1c0-0000-7000-8000-000000000009", "permission.read", "查看权限", "identity"],
      ["0198b1c0-0000-7000-8000-00000000000a", "dictionary.read", "查看字典", "system"],
      ["0198b1c0-0000-7000-8000-00000000000b", "dictionary.manage", "管理字典", "system"],
      ["0198b1c0-0000-7000-8000-00000000000c", "menu.read", "查看菜单", "system"],
      ["0198b1c0-0000-7000-8000-00000000000d", "menu.manage", "管理菜单", "system"],
      ["0198b1c0-0000-7000-8000-00000000000e", "config.read", "查看配置", "system"],
      ["0198b1c0-0000-7000-8000-00000000000f", "config.manage", "管理配置", "system"],
      ["0198b1c0-0000-7000-8000-000000000010", "survey.read", "查看问卷", "survey"],
      ["0198b1c0-0000-7000-8000-000000000011", "survey.create", "创建问卷", "survey"],
      ["0198b1c0-0000-7000-8000-000000000012", "survey.update", "更新问卷", "survey"],
      ["0198b1c0-0000-7000-8000-000000000013", "survey.publish", "发布问卷", "survey"],
      ["0198b1c0-0000-7000-8000-000000000014", "survey.close", "关闭问卷", "survey"],
      ["0198b1c0-0000-7000-8000-000000000015", "survey.respond", "提交问卷", "survey"],
      ["0198b1c0-0000-7000-8000-000000000016", "survey.statistics", "查看统计", "survey"],
      ["0198b1c0-0000-7000-8000-000000000017", "monitor.read", "查看错误监控", "monitor"],
      ["0198b1c0-0000-7000-8000-000000000018", "monitor.manage", "管理监控应用", "monitor"],
      ["0198b1c0-0000-7000-8000-000000000019", "notification.read", "查看通知", "notification"]
    ];
    // 逐条插入并按 code 幂等，重复执行不会复制权限定义。
    for (const [id, code, name, group] of permissions) {
      // 通过 SQL 参数常量生成 migration 内容，执行时不依赖应用服务。
      this.addSql(
        `insert into "permissions" ("id", "code", "name", "group") values ('${id}', '${code}', '${name}', '${group}') on conflict ("code") do nothing`,
      );
    }
    // 监控保留期是必要的默认配置，但 on conflict 不覆盖管理员已经修改的值。
    this.addSql(`
      insert into "system_configs" ("id", "key", "value", "value_type", "description") values
      ('0198b1c0-0000-7000-8000-000000000101', 'monitor.retention_days', '30', 'number', '客户端错误原始记录保留天数')
      on conflict ("key") do nothing;
    `);
  }

  override async down(): Promise<void> {
    // 生产环境不能用 down 删除全部业务表；真实回滚方案是恢复到新数据库再切换连接。
    throw new Error("Baseline migration rollback would destroy data; restore a verified backup instead.");
  }
}
