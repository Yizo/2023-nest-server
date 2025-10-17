import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  ValidationPipe,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FindAllBodyDto, UpdateUserDto, CreateUserDto } from './dto/user-dto';
// import { JwtAuthGuard } from '@/modules/auth/guard';
import { ReqUser } from '@/decorators';
import { User } from '@/modules/user/entities/user.entity';

@Controller({
  version: '1',
  path: 'users',
})
// @UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger,
  ) {}

  // 查询单个用户
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const user = await this.userService.findUserById(id);
      return {
        code: 0,
        message: '用户查询成功',
        data: user,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '查询失败',
      };
    }
  }

  // 查询所有用户
  @Post('list')
  async findAll(@Body() body: FindAllBodyDto, @ReqUser() user: User) {
    try {
      const data: FindAllBodyDto = {
        ...body,
        page: body.page || 1,
        pageSize: body.pageSize || 10,
      };
      const result = await this.userService.findUsers(data);
      return {
        ...result,
        code: 0,
        message: '用户查询成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '查询失败',
      };
    }
  }

  // 新增用户
  @Post('add')
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const result = await this.userService.createUser(createUserDto);
      return {
        data: result,
        code: 0,
        message: '用户新增成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '新增失败',
      };
    }
  }

  // 更新用户
  @Post('update')
  async update(@Body() updateUserDto: UpdateUserDto) {
    try {
      const result = await this.userService.updateUser(updateUserDto);
      return {
        data: result,
        code: 0,
        message: '用户更新成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '更新失败',
      };
    }
  }

  // 删除用户
  @Post(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.userService.removeUser(id);
      return {
        code: 0,
        message: '用户删除成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '删除失败',
      };
    }
  }
}
