import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, FindAllRoleDto } from './dto/role-dto';
import { PermissionsGuard } from '@/modules/permissions/permissions.guard';
import { Permissions } from '@/modules/permissions/permissions.decorator';
import { PermissionAction } from '@/enums';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // 创建角色
  @UseGuards(PermissionsGuard)
  @Permissions({ action: PermissionAction.Create, subject: 'Role' })
  @Post('/create')
  async create(@Body() createRoleDto: CreateRoleDto) {
    try {
      const role = await this.rolesService.createRole(createRoleDto);
      return {
        code: 0,
        message: '角色创建成功',
        data: role,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '角色创建失败',
      };
    }
  }

  // 查询角色列表
  @Post('/list')
  async findAll(@Body() query: FindAllRoleDto) {
    try {
      const data: FindAllRoleDto = {
        ...query,
        page: query.page || 1,
        pageSize: query.pageSize || 10,
      };
      const result = await this.rolesService.findAll(data);
      return {
        ...result,
        code: 0,
        message: '角色查询成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '角色查询失败',
        data: [],
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const role = await this.rolesService.findOne(id);
      if (!role) {
        return {
          code: HttpStatus.NOT_FOUND,
          message: '角色不存在',
        };
      }
      return {
        code: 0,
        message: '角色查询成功',
        data: role,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '角色查询失败',
      };
    }
  }

  @Post('/remove/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.rolesService.removeRole(id);
      return {
        code: 0,
        message: '角色删除成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '角色删除失败',
      };
    }
  }

  // 更新角色
  @Post('/update')
  async update(@Body() updateRoleDto: UpdateRoleDto) {
    try {
      const role = await this.rolesService.updateRole(updateRoleDto);
      return {
        code: 0,
        message: '角色更新成功',
        data: role,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '角色更新失败',
      };
    }
  }

  // 为角色分配权限
  @Post('/:id/permissions')
  async assignPermissions(
    @Param('id', ParseIntPipe) roleId: number,
    @Body('permissionIds') permissionIds: number[],
  ) {
    try {
      const role = await this.rolesService.assignPermissions(
        roleId,
        permissionIds,
      );
      return {
        code: 0,
        message: '权限分配成功',
        data: role,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '权限分配失败',
      };
    }
  }

  // 获取角色的所有权限
  @Get('/:id/permissions')
  async getRolePermissions(@Param('id', ParseIntPipe) roleId: number) {
    try {
      const permissions = await this.rolesService.getRolePermissions(roleId);
      return {
        code: 0,
        message: '权限获取成功',
        data: permissions,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '权限获取失败',
      };
    }
  }

  // 为角色添加权限
  @Post('/:id/permissions/add')
  async addPermissionsToRole(
    @Param('id', ParseIntPipe) roleId: number,
    @Body('permissionIds') permissionIds: number[],
  ) {
    try {
      const role = await this.rolesService.addPermissionsToRole(
        roleId,
        permissionIds,
      );
      return {
        code: 0,
        message: '权限添加成功',
        data: role,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '权限添加失败',
      };
    }
  }

  // 从角色中移除权限
  @Post('/:id/permissions/remove')
  async removePermissionsFromRole(
    @Param('id', ParseIntPipe) roleId: number,
    @Body('permissionIds') permissionIds: number[],
  ) {
    try {
      const role = await this.rolesService.removePermissionsFromRole(
        roleId,
        permissionIds,
      );
      return {
        code: 0,
        message: '权限移除成功',
        data: role,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '权限移除失败',
      };
    }
  }
}
