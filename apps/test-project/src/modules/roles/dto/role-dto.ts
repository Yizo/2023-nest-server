import {
  IsInt,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { RoleStatus, RoleType } from '../entities/roles.entity';
import { PageDto } from '@/common';

export class CreateRoleDto {
  @MaxLength(10, { message: '角色名称不能大于10位' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @IsEnum(RoleType, { message: '角色类型错误' })
  @IsNotEmpty({ message: '角色类型不能为空' })
  code: RoleType;

  @MaxLength(100, { message: '角色描述不能大于100位' })
  @IsOptional()
  description: string;
}

export class UpdateRoleDto {
  @IsInt({ message: '角色ID必须为数字' })
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: number;

  @MaxLength(10, { message: '角色名称不能大于10位' })
  @IsOptional()
  name: string;

  @MaxLength(100, { message: '角色描述不能大于100位' })
  @IsOptional()
  description: string;

  @IsEnum(RoleStatus, { message: '角色状态必须为0或1' })
  @IsOptional()
  status: RoleStatus;
}

export class FindAllRoleDto extends PageDto {
  @MaxLength(10, { message: '角色名称不能大于10位' })
  @IsOptional()
  name?: string;

  @IsEnum(RoleStatus, { message: '角色状态必须为0或1' })
  @IsOptional()
  status?: RoleStatus;

  @IsInt({ message: '角色类型必须是数字' })
  @IsOptional()
  code?: number;

  @MaxLength(100, { message: '角色描述不能大于100位' })
  @IsOptional()
  description?: string;
}
