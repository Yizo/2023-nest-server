import { PartialType } from '@nestjs/mapped-types';
import { CreateXueXiDto } from './create-xue-xi.dto';

export class UpdateXueXiDto extends PartialType(CreateXueXiDto) {}
