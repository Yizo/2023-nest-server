import { Migration } from "@mikro-orm/migrations";

/** 同步角色数据范围枚举的默认值和字段说明。 */
export class Migration20260829132238_sync_role_data_scope extends Migration {
	override name = "Migration20260829132238_sync_role_data_scope";

	override up(): void {
		this.addSql(`alter table "sys_role" alter column "data_scope" set default 'none';`);
		this.addSql(
			`comment on column "sys_role"."data_scope" is '数据范围枚举值, all: 可访问全部数据, custom: 可访问已配置的自定义数据范围, department: 仅可访问当前部门数据, department_and_children: 可访问当前部门及其下级部门数据, self: 仅可访问当前用户数据, none: 无数据权限';`,
		);
	}

	override down(): void {
		this.addSql(`alter table "sys_role" alter column "data_scope" set default 'all';`);
		this.addSql(`comment on column "sys_role"."data_scope" is '数据范围枚举值';`);
	}
}
