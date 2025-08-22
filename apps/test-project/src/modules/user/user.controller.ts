import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FindAllBodyDto, UpdateUserDto, CreateUserDto } from './dto/user-dto';
import { JwtAuthGuard } from '@/modules/auth/guard';
import { ReqUser } from '@/decorators';
import { User } from '@/modules/user/entities/user.entity';

@Controller({
  version: '1',
  path: 'users',
})
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger,
  ) {}

  // 查询单个用户
  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log('id', id);
    this.logger.log(id, 'users:Controller:findOne:id');
    return this.userService.findOne(+id);
  }

  // 查询所有用户
  @Get()
  findAll(@Query(ValidationPipe) body: FindAllBodyDto, @ReqUser() user: User) {
    this.logger.log(user, 'users:Controller:findAll:req:user');
    this.logger.log(body, 'users:Controller:findAll:query');
    return this.userService.findAll(body);
  }

  // 新增用户
  @Post()
  create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // 更新用户
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(+id, updateUserDto);
  }

  // 删除用户
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
