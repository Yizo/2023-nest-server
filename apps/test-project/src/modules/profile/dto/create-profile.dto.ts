import { IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'gender 不能为空' })
  @Type(() => String)
  gender: string;

  @IsString()
  @IsNotEmpty({ message: 'photo 不能为空' })
  @Type(() => String)
  photo: string;

  @IsString()
  @IsNotEmpty({ message: 'address 不能为空' })
  @Type(() => String)
  address: string;
}
