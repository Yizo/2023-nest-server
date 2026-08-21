import { Migration } from "@mikro-orm/migrations";

/** 为用户增加唯一登录名，同时兼容已经存在的本地开发数据。 */
export class Migration20260817000200 extends Migration {
	override async up(): Promise<void> {
		// 先允许为空，确保现有用户可以完成数据回填。
		this.addSql(`alter table "users" add column "username" varchar(80) null;`);
		// 平台所有者使用 superadmin；普通用户使用邮箱前缀和 ID 片段生成不重复用户名。
		this.addSql(`
			update "users"
			set "username" = case
				when "is_platform_owner" = true then 'superadmin'
				else left(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '', 'g'), 60)
					|| '_' || substr(replace("id"::text, '-', ''), 1, 8)
			end;
		`);
		// 回填完成后改为必填，保证所有新用户都有用户名。
		this.addSql(`alter table "users" alter column "username" set not null;`);
		// 数据库层保证用户名全局唯一。
		this.addSql(`alter table "users" add constraint "uq_users_username" unique ("username");`);
	}

	override async down(): Promise<void> {
		// 本地开发可以回滚该增量字段；生产回滚前仍应先备份数据库。
		this.addSql(`alter table "users" drop constraint if exists "uq_users_username";`);
		this.addSql(`alter table "users" drop column if exists "username";`);
	}
}
