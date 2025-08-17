import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, Query, ParseIntPipe } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, FindAllRoleDto } from './dto/role-dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async create(@Body() createRoleDto: CreateRoleDto) {
    try {
      const role = await this.rolesService.create(createRoleDto);
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

  @Get()
  async findAll(@Query() query: FindAllRoleDto) {
    try {
      const { page = 1, pageSize = 10 } = query;
      const [roles, total] = await this.rolesService.findAll(page, pageSize);
      return {
        code: 0,
        message: '角色查询成功',
        data: roles,
        total,
        page,
        pageSize,
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

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateRoleDto: UpdateRoleDto
  ) {
    try {
      const role = await this.rolesService.update(id, updateRoleDto);
      if (!role) {
        return {
          code: HttpStatus.NOT_FOUND,
          message: '角色不存在',
        };
      }
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

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.rolesService.remove(id);
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
}
