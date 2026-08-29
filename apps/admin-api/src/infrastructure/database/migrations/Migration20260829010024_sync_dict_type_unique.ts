import { Migration } from "@mikro-orm/migrations";

/** 同步当前字典类型实体已有的有效唯一索引定义。 */
export class Migration20260829010024_sync_dict_type_unique extends Migration {
	override name = "Migration20260829010024_sync_dict_type_unique";

	override up(): void {
		this.addSql(`drop index "uq_sys_dict_type_code_active";`);
		this.addSql(
			`create unique index "uq_sys_dict_type_code_active" on "sys_dict_type" ("dict_name", "dict_type") where "deleted_at" is null;`,
		);
	}

	override down(): void {
		this.addSql(`drop index "uq_sys_dict_type_code_active";`);
		this.addSql(
			`create unique index "uq_sys_dict_type_code_active" on "sys_dict_type" ("dict_type") where "deleted_at" is null;`,
		);
	}
}
