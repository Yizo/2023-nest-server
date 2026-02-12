import { IsNotEmpty, MaxLength, IsOptional, IsIn, IsInt } from 'class-validator'

export class CreateDictDataDto {
  @IsNotEmpty({ message: '字典类型ID不能为空' })
  typeId!: number

  @IsNotEmpty({ message: '字典名称不能为空' })
  @MaxLength(10, { message: '字典名称不能超过10个字符' })
  name!: string

  @IsNotEmpty({ message: '字典值不能为空' })
  @MaxLength(100, { message: '字典值不能超过100个字符' })
  value!: string

  @IsOptional()
  @IsIn([0, 1], { message: '字典状态必须为0或1' })
  status?: number

  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  sortOrder?: number
}

export class UpdateDictDataDto extends CreateDictDataDto {
  @IsNotEmpty({ message: '字典ID不能为空' })
  @IsInt({ message: '字典ID必须为整数' })
  id: number
}

export class DeleteDictDataDto {
  @IsNotEmpty({ message: '字典ID不能为空' })
  @IsInt({ message: '字典ID必须为整数' })
  id: number

  @IsNotEmpty({ message: '字典类型ID不能为空' })
  @IsInt({ message: '字典类型ID不能为空' })
  typeId?: number
}

export class GetDictDataDto {
  @IsNotEmpty({ message: '字典类型ID不能为空' })
  typeId: number

  @IsOptional()
  page?: number

  @IsOptional()
  pageSize?: number

  @IsOptional()
  name?: string

  @IsOptional()
  value?: string

  @IsOptional()
  @IsIn(['0', '1'], { message: '字典状态必须为0或1' })
  status?: number

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: '排序必须为asc或desc' })
  sort?: 'asc' | 'desc'
}
