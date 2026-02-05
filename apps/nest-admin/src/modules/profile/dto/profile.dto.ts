import {
  IsInt,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsPhoneNumber,
  IsEmail,
} from 'class-validator';
import { GenderType } from '../entities/profile.entity';
import { SortOrder } from '@/enums';
import { PageDto } from '@/common';

export class CreateProfileDto {
  @IsInt({ message: 'id必须是数字' })
  @IsNotEmpty({ message: '用户ID不能为空' })
  userId: number;

  @IsPhoneNumber('CN', { message: '手机号格式不正确' })
  @IsOptional()
  phone: number | null;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email: string | null;

  @IsEnum(GenderType, { message: '性别必须是0或1' })
  @IsOptional()
  gender: GenderType | null;

  @MaxLength(100, { message: '地址不能大于100位' })
  @IsOptional()
  address: string | null;

  @MaxLength(100, { message: '头像不能大于100位' })
  @IsOptional()
  avatar: string | null;
}

export class UpdateProfileDto {
  @IsInt({ message: 'ID必须是数字' })
  @IsNotEmpty({ message: 'ID不能为空' })
  id: number;

  @IsPhoneNumber('CN', { message: '手机号格式不正确' })
  @IsOptional()
  phone: number | null;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email: string | null;

  @MaxLength(100, { message: '地址不能大于100位' })
  @IsOptional()
  address: string | null;

  @MaxLength(100, { message: '头像不能大于100位' })
  @IsOptional()
  avatar: string | null;
}

export class FindAllProfileDto extends PageDto {
  @IsEnum(GenderType, { message: '性别必须是0或1' })
  @IsOptional()
  gender: GenderType | null;

  @IsEnum(SortOrder, { message: '排序必须是ASC或DESC' })
  @IsOptional()
  sort: SortOrder;
}
