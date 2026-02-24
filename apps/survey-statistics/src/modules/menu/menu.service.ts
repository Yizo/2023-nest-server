import { Injectable } from '@nestjs/common'
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Menu } from './entities/menu.entity'

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  findAll() {
    return this.menuRepository.find()
  }

  create(createMenuDto: CreateMenuDto) {
    return 'This action adds a new menu'
  }

  update(updateMenuDto: UpdateMenuDto) {
    const { id } = updateMenuDto
    return `This action updates a #${id} menu`
  }

  remove(id: number) {
    return `This action removes a #${id} menu`
  }
}
