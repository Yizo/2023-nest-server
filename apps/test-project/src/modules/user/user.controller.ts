import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FindAllBodyDto, FindAllBodyDtoPipe } from './dto/user-dto';

@Controller({
  version: '1',
  path: 'user',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/create')
  create(@Body() createUserDto: any) {
    return this.userService.create(createUserDto);
  }

  @Post('/findAll')
  findAll(@Body(new FindAllBodyDtoPipe()) body: FindAllBodyDto) {
    console.log('user findAll body', body);
    return this.userService.findAll(body);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    console.log('id', id);
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
