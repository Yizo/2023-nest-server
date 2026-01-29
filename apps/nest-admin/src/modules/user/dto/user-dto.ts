import {
  IsInt,
  IsOptional,
  IsNotEmpty,
  IsPhoneNumber,
  IsEnum,
} from 'class-validator';
import { UserStatus } from '../entities/user.entity';
import { PageDto } from '@/common';
export class FindAllBodyDto extends PageDto {
  @IsOptional()
  username: string;

  @IsPhoneNumber('CN', { message: '手机号格式不正确' })
  @IsOptional()
  phone: number | null;

  @IsEnum(UserStatus, { message: '状态必须是0或1' })
  @IsOptional()
  status: UserStatus;
}

export class CreateUserDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

export class UpdateUserDto {
  @IsInt({ message: 'ID必须是数字' })
  @IsNotEmpty({ message: 'ID不能为空' })
  id: number;

  @IsOptional()
  username: string;

  @IsOptional()
  password: string;
}
