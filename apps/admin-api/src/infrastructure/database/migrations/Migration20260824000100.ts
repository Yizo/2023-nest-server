import { Migration } from "@mikro-orm/migrations";

export class Migration20260824000100 extends Migration {
	override up(): void {
		this.addSql(`
			create table "sys_dict_type" (
				"id" serial primary key,
				"created_at" timestamptz not null,
				"updated_at" timestamptz not null,
				"deleted_at" timestamptz null,
				"dict_name" varchar(100) not null,
				"dict_type" varchar(100) not null,
				"status" smallint not null default 1,
				"remark" varchar(500) null,
				constraint "chk_sys_dict_type_status" check ("status" in (0, 1))
			);
			create unique index "uq_sys_dict_type_code_active"
				on "sys_dict_type" ("dict_type") where "deleted_at" is null;

			create table "sys_dict_data" (
				"id" serial primary key,
				"created_at" timestamptz not null,
				"updated_at" timestamptz not null,
				"deleted_at" timestamptz null,
				"label" varchar(100) not null,
				"value" varchar(100) not null,
				"sort" integer not null default 0,
				"status" smallint not null default 1,
				"remark" varchar(500) null,
				constraint "chk_sys_dict_data_status" check ("status" in (0, 1))
			);

			-- 关联表只保存普通 ID；项目明确不使用数据库外键，由 Service 维护关联完整性。
			create table "sys_dict_type_data" (
				"id" serial primary key,
				"created_at" timestamptz not null,
				"updated_at" timestamptz not null,
				"deleted_at" timestamptz null,
				"dict_type_id" integer not null,
				"dict_data_id" integer not null
			);
			create index "idx_sys_dict_type_data_type_active"
				on "sys_dict_type_data" ("dict_type_id") where "deleted_at" is null;
			create unique index "uq_sys_dict_type_data_data_active"
				on "sys_dict_type_data" ("dict_data_id") where "deleted_at" is null;
		`);
	}

	override down(): void {
		this.addSql('drop table if exists "sys_dict_type_data";');
		this.addSql('drop table if exists "sys_dict_data";');
		this.addSql('drop table if exists "sys_dict_type";');
	}
}
