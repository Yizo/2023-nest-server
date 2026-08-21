import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@/common/decorators";
import { CreateDictionaryItemDto, CreateDictionaryTypeDto, CreateMenuDto, DictionaryItemListQueryDto, DictionaryTypeListQueryDto, UpdateDictionaryItemDto, UpdateDictionaryTypeDto, UpdateMenuDto, UpsertSystemConfigDto } from "./system.dto";
import { SystemService } from "./system.service";

/** 系统元数据管理：字典、菜单、配置；它不负责数据库结构初始化。 */
@ApiTags("系统")
@ApiBearerAuth("bearer")
@Controller("system")
export class SystemController {
  constructor(private readonly service: SystemService) {}

  @Get("dictionary-types")
  @RequirePermissions("dictionary.read")
  @ApiOperation({ summary: "字典类型列表" })
  dictionaryTypes(@Query() query: DictionaryTypeListQueryDto) {
    return this.service.listDictionaryTypes(query);
  }

  @Post("dictionary-types")
  @RequirePermissions("dictionary.manage")
  @ApiOperation({ summary: "创建字典类型" })
  createDictionaryType(@Body() body: CreateDictionaryTypeDto) {
    return this.service.createDictionaryType(body);
  }

  @Post("dictionary-types/:id/update")
  @RequirePermissions("dictionary.manage")
  @ApiParam({ name: "id", description: "字典类型 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新字典类型" })
  updateDictionaryType(@Param("id") id: string, @Body() body: UpdateDictionaryTypeDto) {
    return this.service.updateDictionaryType(id, body);
  }

  @Get("dictionary-items")
  @RequirePermissions("dictionary.read")
  @ApiOperation({ summary: "字典项列表" })
  dictionaryItems(@Query() query: DictionaryItemListQueryDto) {
    return this.service.listDictionaryItems(query);
  }

  @Post("dictionary-items")
  @RequirePermissions("dictionary.manage")
  @ApiOperation({ summary: "创建字典项" })
  createDictionaryItem(@Body() body: CreateDictionaryItemDto) {
    return this.service.createDictionaryItem(body);
  }

  @Post("dictionary-items/:id/update")
  @RequirePermissions("dictionary.manage")
  @ApiParam({ name: "id", description: "字典项 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新字典项" })
  updateDictionaryItem(@Param("id") id: string, @Body() body: UpdateDictionaryItemDto) {
    return this.service.updateDictionaryItem(id, body);
  }

  @Get("menus")
  @RequirePermissions("menu.read")
  @ApiOperation({ summary: "菜单列表" })
  menus() {
    return this.service.listMenus();
  }

  @Post("menus")
  @RequirePermissions("menu.manage")
  @ApiOperation({ summary: "创建菜单" })
  createMenu(@Body() body: CreateMenuDto) {
    return this.service.createMenu(body);
  }

  @Post("menus/:id/update")
  @RequirePermissions("menu.manage")
  @ApiParam({ name: "id", description: "菜单 ID（UUIDv7）" })
  @ApiOperation({ summary: "更新菜单" })
  updateMenu(@Param("id") id: string, @Body() body: UpdateMenuDto) {
    return this.service.updateMenu(id, body);
  }

  @Get("configs")
  @RequirePermissions("config.read")
  @ApiOperation({ summary: "系统配置列表" })
  configs() {
    return this.service.listConfigs();
  }

  @Post("configs/upsert")
  @RequirePermissions("config.manage")
  @ApiOperation({ summary: "新增或更新系统配置", description: "按配置键 upsert。" })
  upsertConfig(@Body() body: UpsertSystemConfigDto) {
    return this.service.upsertConfig(body);
  }
}
