import { Migration } from '@mikro-orm/migrations';

export class Migration20260830044514 extends Migration {

  override name = 'Migration20260830044514';

  override up(): void | Promise<void> {
    this.addSql(`create table "sys_user" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "user_name" varchar(100) not null, "display_name" varchar(100) not null, "password_hash" varchar(255) not null, "status" smallint not null default 1);`);
    this.addSql(`comment on table "sys_user" is '用户';`);
    this.addSql(`comment on column "sys_user"."id" is '主键';`);
    this.addSql(`comment on column "sys_user"."created_at" is '创建时间';`);
    this.addSql(`comment on column "sys_user"."updated_at" is '更新时间';`);
    this.addSql(`comment on column "sys_user"."deleted_at" is '软删除时间，空表示有效';`);
    this.addSql(`comment on column "sys_user"."user_name" is '用户账号，创建后不可修改';`);
    this.addSql(`comment on column "sys_user"."display_name" is '显示名称';`);
    this.addSql(`comment on column "sys_user"."password_hash" is '密码哈希';`);
    this.addSql(`comment on column "sys_user"."status" is '状态，0 停用，1 启用';`);
    this.addSql(`create unique index "uq_sys_user_name_active" on "sys_user" ("user_name") where "deleted_at" is null;`);

    this.addSql(`create table "sys_user_role" ("user_id" int not null, "role_id" int not null, primary key ("user_id", "role_id"));`);
    this.addSql(`comment on table "sys_user_role" is '用户角色关联';`);
    this.addSql(`comment on column "sys_user_role"."user_id" is '用户 ID';`);
    this.addSql(`comment on column "sys_user_role"."role_id" is '角色 ID';`);
    this.addSql(`create index "idx_sys_user_role_role" on "sys_user_role" ("role_id");`);

    this.addSql(`create table "sys_user_dept" ("user_id" int not null, "dept_id" int not null, primary key ("user_id", "dept_id"));`);
    this.addSql(`comment on table "sys_user_dept" is '用户部门关联';`);
    this.addSql(`comment on column "sys_user_dept"."user_id" is '用户 ID';`);
    this.addSql(`comment on column "sys_user_dept"."dept_id" is '部门 ID';`);
    this.addSql(`create index "idx_sys_user_dept_dept" on "sys_user_dept" ("dept_id");`);
  }

}
