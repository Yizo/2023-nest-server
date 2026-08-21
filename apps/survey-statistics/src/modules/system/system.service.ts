import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { DictionaryItem, DictionaryType, Menu, Permission, SystemConfig } from "@/database/entities";
import type { CreateDictionaryItemDto, CreateDictionaryTypeDto, CreateMenuDto, DictionaryItemListQueryDto, DictionaryTypeListQueryDto, UpdateDictionaryItemDto, UpdateDictionaryTypeDto, UpdateMenuDto, UpsertSystemConfigDto } from "./system.dto";
import type { PageResult } from "@/common/pagination/pagination";

@Injectable()
export class SystemService {
  constructor(private readonly em: EntityManager) {}

  async listDictionaryTypes(query: DictionaryTypeListQueryDto): Promise<PageResult<Record<string, unknown>>> {
    const conditions = ["dt.deleted_at is null"];
    const params: unknown[] = [];
    if (query.name) { conditions.push("dt.name ilike ?"); params.push(`%${query.name}%`); }
    if (query.code) { conditions.push("dt.code ilike ?"); params.push(`%${query.code}%`); }
    if (query.enabled !== undefined) { conditions.push("dt.enabled = ?"); params.push(query.enabled); }
    const where = conditions.join(" and ");
    const connection = this.em.getConnection();
    const countRows = await connection.execute<Array<{ total: string }>>(
      `select count(*)::text as total from dict_types dt where ${where}`,
      params,
    );
    const items = await connection.execute<Array<Record<string, unknown>>>(
      `select dt.id, dt.code, dt.name, dt.enabled,
              dt.created_at as "createdAt", dt.updated_at as "updatedAt",
              (select count(*)::int from dict_items di where di.dict_type_id = dt.id and di.deleted_at is null) as count
       from dict_types dt where ${where}
       order by dt.updated_at ${query.sort === "asc" ? "asc" : "desc"}, dt.id desc
       limit ? offset ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return { items, page: query.page, pageSize: query.pageSize, total: Number(countRows[0]?.total ?? 0) };
  }

  async createDictionaryType(input: CreateDictionaryTypeDto): Promise<{ id: string }> {
    if (await this.em.findOne(DictionaryType, { code: input.code })) throw new ConflictException("字典类型编码已存在");
    const entity = this.em.create(DictionaryType, input);
    this.em.persist(entity);
    await this.em.flush();
    return { id: entity.id };
  }

  async updateDictionaryType(id: string, input: UpdateDictionaryTypeDto): Promise<void> {
    const entity = await this.em.findOne(DictionaryType, { id, deletedAt: null });
    if (!entity) throw new NotFoundException("字典类型不存在");
    if (input.name !== undefined) entity.name = input.name;
    if (input.enabled !== undefined) entity.enabled = input.enabled;
    await this.em.flush();
  }

  async listDictionaryItems(query: DictionaryItemListQueryDto): Promise<PageResult<Record<string, unknown>>> {
    const conditions = ["dict_type_id = ?", "deleted_at is null"];
    const params: unknown[] = [query.dictTypeId];
    if (query.label) { conditions.push("label ilike ?"); params.push(`%${query.label}%`); }
    if (query.value) { conditions.push("value ilike ?"); params.push(`%${query.value}%`); }
    if (query.enabled !== undefined) { conditions.push("enabled = ?"); params.push(query.enabled); }
    const where = conditions.join(" and ");
    const connection = this.em.getConnection();
    const countRows = await connection.execute<Array<{ total: string }>>(
      `select count(*)::text as total from dict_items where ${where}`,
      params,
    );
    const items = await connection.execute<Array<Record<string, unknown>>>(
      `select id, dict_type_id as "dictTypeId", label, value, sort_order as "sortOrder", enabled,
              created_at as "createdAt", updated_at as "updatedAt"
       from dict_items where ${where}
       order by sort_order ${query.sort === "desc" ? "desc" : "asc"}, id asc
       limit ? offset ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return { items, page: query.page, pageSize: query.pageSize, total: Number(countRows[0]?.total ?? 0) };
  }

  async createDictionaryItem(input: CreateDictionaryItemDto): Promise<{ id: string }> {
    // 无物理外键时，Service 必须在写入前手动确认父级字典类型存在。
    if (!(await this.em.findOne(DictionaryType, { id: input.dictTypeId, deletedAt: null }))) throw new BadRequestException("字典类型不存在");
    if (await this.em.findOne(DictionaryItem, { dictTypeId: input.dictTypeId, value: input.value })) throw new ConflictException("字典值已存在");
    const entity = this.em.create(DictionaryItem, input);
    this.em.persist(entity);
    await this.em.flush();
    return { id: entity.id };
  }

  async updateDictionaryItem(id: string, input: UpdateDictionaryItemDto): Promise<void> {
    const entity = await this.em.findOne(DictionaryItem, { id, deletedAt: null });
    if (!entity) throw new NotFoundException("字典项不存在");
    Object.assign(entity, input);
    await this.em.flush();
  }

  listMenus() {
    return this.em.find(Menu, { deletedAt: null }, {
      orderBy: { sortOrder: "asc", id: "asc" },
      fields: ["id", "parentId", "permissionId", "name", "path", "sortOrder", "enabled"],
    });
  }

  async createMenu(input: CreateMenuDto): Promise<{ id: string }> {
    // 菜单可以关联父菜单和权限，引用检查集中在 validateMenuReferences。
    await this.validateMenuReferences(input.parentId, input.permissionId);
    const entity = this.em.create(Menu, { ...input, parentId: input.parentId ?? null, permissionId: input.permissionId ?? null });
    this.em.persist(entity);
    await this.em.flush();
    return { id: entity.id };
  }

  async updateMenu(id: string, input: UpdateMenuDto): Promise<void> {
    const entity = await this.em.findOne(Menu, { id, deletedAt: null });
    if (!entity) throw new NotFoundException("菜单不存在");
    if (input.parentId === id) throw new BadRequestException("菜单不能以自身作为父菜单");
    await this.validateMenuReferences(input.parentId ?? undefined, input.permissionId ?? undefined);
    Object.assign(entity, input);
    await this.em.flush();
  }

  listConfigs() {
    return this.em.find(SystemConfig, { deletedAt: null }, { orderBy: { key: "asc" }, fields: ["id", "key", "value", "valueType", "description"] });
  }

  async upsertConfig(input: UpsertSystemConfigDto): Promise<{ id: string }> {
    // 配置允许被管理员修改；重复执行“存在则更新、不存在则创建”不应覆盖管理员的值。
    this.validateConfigValue(input.value, input.valueType);
    let entity = await this.em.findOne(SystemConfig, { key: input.key });
    if (!entity) {
      entity = this.em.create(SystemConfig, { ...input, description: input.description ?? null });
      this.em.persist(entity);
    } else {
      entity.value = input.value;
      entity.valueType = input.valueType;
      entity.description = input.description ?? entity.description;
      entity.deletedAt = null;
    }
    await this.em.flush();
    return { id: entity.id };
  }

  async numberConfig(key: string, fallback: number): Promise<number> {
    const config = await this.em.findOne(SystemConfig, { key, deletedAt: null }, { fields: ["value"] });
    const parsed = Number(config?.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async validateMenuReferences(parentId?: string, permissionId?: string): Promise<void> {
    if (parentId && !(await this.em.findOne(Menu, { id: parentId, deletedAt: null }))) throw new BadRequestException("父菜单不存在");
    if (permissionId && !(await this.em.findOne(Permission, { id: permissionId, deletedAt: null }))) throw new BadRequestException("权限不存在");
  }

  private validateConfigValue(value: string, type: UpsertSystemConfigDto["valueType"]): void {
    // value 在数据库中统一存 text，读取时必须根据 valueType 做边界校验。
    if (type === "number" && !Number.isFinite(Number(value))) throw new BadRequestException("配置值不是有效数字");
    if (type === "boolean" && value !== "true" && value !== "false") throw new BadRequestException("布尔配置只能为 true 或 false");
    if (type === "json") {
      try { JSON.parse(value); } catch { throw new BadRequestException("配置值不是有效 JSON"); }
    }
  }
}
