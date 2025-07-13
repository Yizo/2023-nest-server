import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { DtoPipe } from '../user/dto/user-dto';

@Controller({
  version: '1',
  path: 'profiles',
})
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  create(@Body(new DtoPipe()) createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(+id);
  }
}
