import { Migration } from '@mikro-orm/migrations';

export class Migration20260825082257 extends Migration {

  override name = 'Migration20260825082257';

  override up(): void | Promise<void> {
    this.addSql(`alter table "sys_dict_type" drop constraint "chk_sys_dict_type_status";`);
    this.addSql(`comment on column "sys_dict_type"."created_at" is '创建时间';`);
    this.addSql(`comment on column "sys_dict_type"."deleted_at" is '软删除时间，空表示有效';`);
    this.addSql(`comment on column "sys_dict_type"."dict_name" is '字典名称';`);
    this.addSql(`comment on column "sys_dict_type"."dict_type" is '字典类型编码，创建后不可修改';`);
    this.addSql(`comment on column "sys_dict_type"."id" is '主键';`);
    this.addSql(`comment on column "sys_dict_type"."remark" is '备注';`);
    this.addSql(`comment on column "sys_dict_type"."status" is '状态，0 停用，1 启用';`);
    this.addSql(`comment on column "sys_dict_type"."updated_at" is '更新时间';`);
    this.addSql(`comment on table "sys_dict_type" is '字典类型';`);

    this.addSql(`alter table "sys_dict_data" drop constraint "chk_sys_dict_data_status";`);
    this.addSql(`comment on column "sys_dict_data"."created_at" is '创建时间';`);
    this.addSql(`comment on column "sys_dict_data"."deleted_at" is '软删除时间，空表示有效';`);
    this.addSql(`comment on column "sys_dict_data"."id" is '主键';`);
    this.addSql(`comment on column "sys_dict_data"."label" is '字典标签';`);
    this.addSql(`comment on column "sys_dict_data"."remark" is '备注';`);
    this.addSql(`comment on column "sys_dict_data"."sort" is '排序，数值越小越靠前';`);
    this.addSql(`comment on column "sys_dict_data"."status" is '状态，0 停用，1 启用';`);
    this.addSql(`comment on column "sys_dict_data"."updated_at" is '更新时间';`);
    this.addSql(`comment on column "sys_dict_data"."value" is '字典值';`);
    this.addSql(`comment on table "sys_dict_data" is '字典数据';`);
	  }

	  override down(): void | Promise<void> {
	    this.addSql(`comment on column "sys_dict_data"."id" is null;`);
    this.addSql(`comment on column "sys_dict_data"."created_at" is null;`);
    this.addSql(`comment on column "sys_dict_data"."updated_at" is null;`);
    this.addSql(`comment on column "sys_dict_data"."deleted_at" is null;`);
    this.addSql(`comment on column "sys_dict_data"."label" is null;`);
    this.addSql(`comment on column "sys_dict_data"."value" is null;`);
    this.addSql(`comment on column "sys_dict_data"."sort" is null;`);
    this.addSql(`comment on column "sys_dict_data"."status" is null;`);
    this.addSql(`comment on column "sys_dict_data"."remark" is null;`);
    this.addSql(`alter table "sys_dict_data" add constraint "chk_sys_dict_data_status" check ("status" in (0, 1));`);
    this.addSql(`comment on table "sys_dict_data" is '';`);

    this.addSql(`comment on column "sys_dict_type"."id" is null;`);
    this.addSql(`comment on column "sys_dict_type"."created_at" is null;`);
    this.addSql(`comment on column "sys_dict_type"."updated_at" is null;`);
    this.addSql(`comment on column "sys_dict_type"."deleted_at" is null;`);
    this.addSql(`comment on column "sys_dict_type"."dict_name" is null;`);
    this.addSql(`comment on column "sys_dict_type"."dict_type" is null;`);
    this.addSql(`comment on column "sys_dict_type"."status" is null;`);
    this.addSql(`comment on column "sys_dict_type"."remark" is null;`);
    this.addSql(`alter table "sys_dict_type" add constraint "chk_sys_dict_type_status" check ("status" in (0, 1));`);
    this.addSql(`comment on table "sys_dict_type" is '';`);
  }

}
