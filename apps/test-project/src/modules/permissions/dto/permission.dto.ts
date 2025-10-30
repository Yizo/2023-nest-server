import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { PermissionType } from '@/enums';

export class CreatePermissionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsInt()
  @IsEnum(PermissionType)
  type: PermissionType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  apiPath?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsInt()
  @IsOptional()
  status?: number;
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsEnum(PermissionType)
  @IsOptional()
  type?: PermissionType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  apiPath?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsInt()
  @IsOptional()
  status?: number;
}

export class FindAllPermissionDto {
  @IsInt()
  @IsOptional()
  page?: number;

  @IsInt()
  @IsOptional()
  pageSize?: number;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsEnum(PermissionType)
  @IsOptional()
  type?: PermissionType;

  @IsInt()
  @IsOptional()
  status?: number;
}
