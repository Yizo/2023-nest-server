import { IsNotEmpty, IsNumber } from 'class-validator'

export class CreateMenuDto {}

export class UpdateMenuDto extends CreateMenuDto {
  @IsNotEmpty({ message: '菜单ID不能为空' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '菜单ID必须是数字' })
  id: number
}
