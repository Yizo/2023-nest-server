import { Migration } from "@mikro-orm/migrations";

/** 删除角色数据范围字段；数据范围不再属于角色模型。 */
export class Migration20260902000000_remove_role_data_scope extends Migration {
	override name = "Migration20260902000000_remove_role_data_scope";

	override up(): void {
		this.addSql(`alter table "sys_role" drop column "data_scope";`);
	}

	override down(): void {
		this.addSql(
			`alter table "sys_role" add column "data_scope" varchar(100) not null default 'none';`,
		);
		this.addSql(
			`comment on column "sys_role"."data_scope" is '数据范围枚举值';`,
		);
	}
}
