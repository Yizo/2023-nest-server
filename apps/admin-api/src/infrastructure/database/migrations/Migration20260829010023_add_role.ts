import { Migration } from '@mikro-orm/migrations';

export class Migration20260829010023_add_role extends Migration {

  override name = 'Migration20260829010023_add_role';

  override up(): void | Promise<void> {
    this.addSql(`create table "sys_role" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "role_name" varchar(100) not null, "role_code" varchar(100) not null, "data_scope" varchar(100) not null default 'all', "status" smallint not null default 1, "remark" varchar(500) null);`);
    this.addSql(`comment on table "sys_role" is '角色';`);
    this.addSql(`comment on column "sys_role"."id" is '主键';`);
    this.addSql(`comment on column "sys_role"."created_at" is '创建时间';`);
    this.addSql(`comment on column "sys_role"."updated_at" is '更新时间';`);
    this.addSql(`comment on column "sys_role"."deleted_at" is '软删除时间，空表示有效';`);
    this.addSql(`comment on column "sys_role"."role_name" is '角色名称';`);
    this.addSql(`comment on column "sys_role"."role_code" is '角色编码，创建后不可修改';`);
    this.addSql(`comment on column "sys_role"."data_scope" is '数据范围枚举值';`);
    this.addSql(`comment on column "sys_role"."status" is '状态，0 停用，1 启用';`);
    this.addSql(`comment on column "sys_role"."remark" is '备注';`);
    this.addSql(`create unique index "uq_sys_role_code_active" on "sys_role" ("role_code") where "deleted_at" is null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table "sys_role";`);
  }

}
