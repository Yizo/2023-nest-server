import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  gender: string;

  @IsOptional()
  @IsString()
  photo: string;

  @IsOptional()
  @IsString()
  address: string;
}

export class CreateAuthDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;

  @IsOptional()
  @Type(() => UpdateProfileDto)
  profile?: UpdateProfileDto;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roles?: number[];
}

export class LoginDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
