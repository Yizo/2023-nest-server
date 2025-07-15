import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Logger,
  Headers,
} from '@nestjs/common';
import { CustomValidationPipe } from '@/pipes/validation.pipe';
import { UserService } from './user.service';
import { FindAllBodyDto, UpdateUserDto } from './dto/user-dto';

@Controller({
  version: '1',
  path: 'users',
})
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger,
  ) {}

  // 查询单个用户
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    console.log('id', id);
    this.logger.log(id, 'users:Controller:findOne:id');
    return this.userService.findOne(+id);
  }

  // 查询所有用户
  @Get()
  findAll(
    @Query(CustomValidationPipe) body: FindAllBodyDto,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(headers, 'users:Controller:findAll:headers');
    this.logger.log(body, 'users:Controller:findAll:query');
    return this.userService.findAll(body);
  }

  // 新增用户
  @Post()
  create(@Body() createUserDto: any) {
    return this.userService.create(createUserDto);
  }

  // 更新用户
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(CustomValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(+id, updateUserDto);
  }

  // 删除用户
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
