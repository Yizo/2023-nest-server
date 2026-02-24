import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common'
import { MenuService } from './menu.service'
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto'

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  findAll() {
    return this.menuService.findAll()
  }

  @Post()
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto)
  }

  @Post()
  update(@Body() updateMenuDto: UpdateMenuDto) {
    return this.menuService.update(updateMenuDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuService.remove(+id)
  }
}
