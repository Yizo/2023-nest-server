import {
  IsString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString({ message: '角色名称必须为字符串' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @MaxLength(6, { message: '角色标识不能大于6位' })
  @IsInt({ message: '角色标识必须为数字' })
  @IsNotEmpty({ message: '角色标识不能为空' })
  code: number;

  @IsOptional()
  description: string;
}

export class UpdateRoleDto {
  @IsString({ message: '角色名称必须为字符串' })
  @IsOptional()
  name: string;

  @IsOptional()
  description: string;
}

export class FindAllRoleDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  pageSize: number;
}
