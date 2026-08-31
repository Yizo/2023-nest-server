import { Migration } from '@mikro-orm/migrations';

export class Migration20260831062427 extends Migration {

  override name = 'Migration20260831062427';

  override up(): void | Promise<void> {
    this.addSql(`create table "sys_menu" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "type" varchar(20) not null, "parent_id" int null, "name" varchar(100) not null, "code" varchar(100) null, "route_name" varchar(100) null, "path" varchar(255) null, "component" varchar(255) null, "redirect" varchar(255) null, "icon" varchar(100) null, "sort" int not null default 0, "visible" boolean not null default true, "keep_alive" boolean null);`);
    this.addSql(`comment on table "sys_menu" is '菜单';`);
    this.addSql(`comment on column "sys_menu"."id" is '主键';`);
    this.addSql(`comment on column "sys_menu"."created_at" is '创建时间';`);
    this.addSql(`comment on column "sys_menu"."updated_at" is '更新时间';`);
    this.addSql(`comment on column "sys_menu"."deleted_at" is '软删除时间，空表示有效';`);
    this.addSql(`comment on column "sys_menu"."type" is '类型，directory 目录，menu 菜单，action 操作';`);
    this.addSql(`comment on column "sys_menu"."parent_id" is '父菜单 ID，空表示根菜单';`);
    this.addSql(`comment on column "sys_menu"."name" is '名称';`);
    this.addSql(`comment on column "sys_menu"."code" is '操作编码';`);
    this.addSql(`comment on column "sys_menu"."route_name" is '路由名称';`);
    this.addSql(`comment on column "sys_menu"."path" is '路由路径';`);
    this.addSql(`comment on column "sys_menu"."component" is '页面组件';`);
    this.addSql(`comment on column "sys_menu"."redirect" is '重定向地址';`);
    this.addSql(`comment on column "sys_menu"."icon" is '图标';`);
    this.addSql(`comment on column "sys_menu"."sort" is '排序，数值越小越靠前';`);
    this.addSql(`comment on column "sys_menu"."visible" is '是否显示';`);
    this.addSql(`comment on column "sys_menu"."keep_alive" is '是否缓存页面';`);
    this.addSql(`create index "idx_sys_menu_parent_active" on "sys_menu" ("parent_id") where "deleted_at" is null;`);
    this.addSql(`create unique index "uq_sys_menu_code_active" on "sys_menu" ("code") where "deleted_at" is null;`);
    this.addSql(`create unique index "uq_sys_menu_route_name_active" on "sys_menu" ("route_name") where "deleted_at" is null;`);
  }

}
