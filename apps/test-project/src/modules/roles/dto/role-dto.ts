import { IsString, IsInt, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name: string;
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
