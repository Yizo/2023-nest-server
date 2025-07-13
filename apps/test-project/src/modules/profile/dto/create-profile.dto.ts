import { IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  gender: string;

  @IsString()
  photo: string;

  @IsString()
  address: string;
}
