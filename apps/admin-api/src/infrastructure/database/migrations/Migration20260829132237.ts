import { Migration } from '@mikro-orm/migrations';

export class Migration20260829132237 extends Migration {

  override name = 'Migration20260829132237';

  override up(): void | Promise<void> {
    this.addSql(`create table "sys_dept" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "dept_name" varchar(100) not null, "parent_id" int null, "ancestors" varchar(1000) not null default '', "sort" int not null default 0, "status" smallint not null default 1);`);
    this.addSql(`comment on table "sys_dept" is '部门';`);
    this.addSql(`comment on column "sys_dept"."id" is '主键';`);
    this.addSql(`comment on column "sys_dept"."created_at" is '创建时间';`);
    this.addSql(`comment on column "sys_dept"."updated_at" is '更新时间';`);
    this.addSql(`comment on column "sys_dept"."deleted_at" is '软删除时间，空表示有效';`);
    this.addSql(`comment on column "sys_dept"."dept_name" is '部门名称';`);
    this.addSql(`comment on column "sys_dept"."parent_id" is '父部门 ID，空表示根部门';`);
    this.addSql(`comment on column "sys_dept"."ancestors" is '祖级部门 ID 列表，逗号分隔，不含自身';`);
    this.addSql(`comment on column "sys_dept"."sort" is '排序，数值越小越靠前';`);
    this.addSql(`comment on column "sys_dept"."status" is '状态，0 停用，1 启用';`);
    this.addSql(`create index "idx_sys_dept_parent_active" on "sys_dept" ("parent_id") where "deleted_at" is null;`);

  }

  override down(): void | Promise<void> {
    this.addSql(`drop table "sys_dept";`);
  }

}
