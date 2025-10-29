import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';

import { PermissionsService } from './permissions.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/permission.dto';
import { Permission } from './entities/permissions.entity';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { PermissionAction } from '@/enums';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @UseGuards(PermissionsGuard)
  @Permissions({ action: PermissionAction.Create, subject: 'Permission' })
  @Post()
  async create(
    @Body(ValidationPipe) createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    return this.permissionsService.create(createPermissionDto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ action: PermissionAction.Read, subject: 'Permission' })
  @Post('/list')
  async findAll(@Body() query: any): Promise<any> {
    try {
      const result = await this.permissionsService.findAll(query);
      return {
        ...result,
        code: 0,
        message: '权限列表查询成功',
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message || '权限列表查询失败',
        data: [],
      };
    }
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ action: PermissionAction.Read, subject: 'Permission' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Permission> {
    return this.permissionsService.findOne(id);
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ action: PermissionAction.Update, subject: 'Permission' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @UseGuards(PermissionsGuard)
  @Permissions({ action: PermissionAction.Delete, subject: 'Permission' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.permissionsService.remove(id);
  }
}
