import { Migration } from "@mikro-orm/migrations";

/** 将一对多收回到字典数据表，删除独立关联表。 */
export class Migration20260825000100 extends Migration {
	override up(): void {
		this.addSql(`
			alter table "sys_dict_data"
				add column "dict_type_id" integer null;
			comment on column "sys_dict_data"."dict_type_id" is '字典类型 ID';

			update "sys_dict_data" as data
			set "dict_type_id" = relation."dict_type_id"
			from "sys_dict_type_data" as relation
			where relation."dict_data_id" = data."id"
				and relation."deleted_at" is null;

			update "sys_dict_data" as data
			set "dict_type_id" = relation."dict_type_id"
			from "sys_dict_type_data" as relation
			where relation."dict_data_id" = data."id"
				and data."dict_type_id" is null;

			do $$
			begin
				if exists (select 1 from "sys_dict_data" where "dict_type_id" is null) then
					raise exception '存在无法确定字典类型的 sys_dict_data，请先修复关联数据';
				end if;
			end
			$$;

			alter table "sys_dict_data"
				alter column "dict_type_id" set not null;

			create index "idx_sys_dict_data_type_active"
				on "sys_dict_data" ("dict_type_id") where "deleted_at" is null;
			create unique index "uq_sys_dict_data_type_value_active"
				on "sys_dict_data" ("dict_type_id", "value") where "deleted_at" is null;

			drop table if exists "sys_dict_type_data";
		`);
	}

	override down(): void {
		this.addSql(`
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

			insert into "sys_dict_type_data" ("created_at", "updated_at", "deleted_at", "dict_type_id", "dict_data_id")
			select "created_at", "updated_at", "deleted_at", "dict_type_id", "id"
			from "sys_dict_data";

			drop index if exists "uq_sys_dict_data_type_value_active";
			drop index if exists "idx_sys_dict_data_type_active";
			alter table "sys_dict_data" drop column "dict_type_id";
		`);
	}
}
