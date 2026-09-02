import { Migration } from "@mikro-orm/migrations";

/** 将旧菜单类型收敛为页面、菜单、外链和操作。 */
export class Migration20260902000001_rename_menu_types extends Migration {
	override name = "Migration20260902000001_rename_menu_types";

	override up(): void {
		this.addSql(
			`update "sys_menu" set "type" = case "type" when 'directory' then 'menu' when 'menu' then 'page' else "type" end;`,
		);
		this.addSql(
			`comment on column "sys_menu"."type" is '类型，page 页面，menu 菜单，external 外链，action 操作';`,
		);
	}

	override down(): void {
		this.addSql(
			`update "sys_menu" set "type" = case "type" when 'page' then 'menu' when 'menu' then 'directory' when 'external' then 'menu' else "type" end;`,
		);
		this.addSql(
			`comment on column "sys_menu"."type" is '类型，directory 目录，menu 菜单，action 操作';`,
		);
	}
}
