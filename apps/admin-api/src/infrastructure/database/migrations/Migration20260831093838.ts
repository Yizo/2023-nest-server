import { Migration } from '@mikro-orm/migrations';

export class Migration20260831093838 extends Migration {

  override name = 'Migration20260831093838';

  override up(): void | Promise<void> {
    this.addSql(`create table "sys_role_menu" ("role_id" int not null, "menu_id" int not null, primary key ("role_id", "menu_id"));`);
    this.addSql(`comment on table "sys_role_menu" is '角色菜单关联';`);
    this.addSql(`comment on column "sys_role_menu"."role_id" is '角色 ID';`);
    this.addSql(`comment on column "sys_role_menu"."menu_id" is '菜单 ID';`);
    this.addSql(`create index "idx_sys_role_menu_menu" on "sys_role_menu" ("menu_id");`);
  }

}
