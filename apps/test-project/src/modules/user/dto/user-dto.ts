import {
  IsString,
  IsInt,
  IsEnum,
  Min,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from '@/enums';
import { Transform } from 'class-transformer';

export class FindAllBodyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  pageSize: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(SortOrder)
  @IsOptional()
  sort: SortOrder;

  @IsString()
  @IsOptional()
  gender: string;

  @IsInt()
  @IsOptional()
  role: number;
}

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

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile: UpdateProfileDto;
}
