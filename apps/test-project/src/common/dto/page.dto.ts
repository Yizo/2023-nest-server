import { IsInt, IsOptional, Min } from 'class-validator';

export class PageDto {
  @Min(1, { message: 'page必须大于等于1' })
  @IsInt({ message: 'page必须是数字' })
  @IsOptional()
  page: number;

  @Min(1, { message: 'pageSize必须大于等于1' })
  @IsInt({ message: 'pageSize必须是数字' })
  @IsOptional()
  pageSize: number;
}
