import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ValidationPipe,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  FindAllProfileDto,
} from './dto/profile.dto';

@Controller({
  version: '1',
  path: 'profiles',
})
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.profileService.findOne(id);
      return {
        data: result,
        code: 0,
        message: '查询成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '查询失败',
      };
    }
  }

  @Post('/list')
  async findAll(@Body() data: FindAllProfileDto) {
    const payload: FindAllProfileDto = {
      ...data,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 10,
    };
    try {
      const result = await this.profileService.findAll(payload);
      return {
        ...result,
        code: 0,
        message: '查询成功',
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '查询失败',
      };
    }
  }

  @Post()
  async create(@Body(ValidationPipe) createProfileDto: CreateProfileDto) {
    try {
      const profile = await this.profileService.createProfile(createProfileDto);
      return {
        code: 0,
        message: '新增成功',
        data: profile,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '新增失败',
      };
    }
  }

  // 更新用户信息
  @Post('update')
  async update(@Body() updateProfileDto: UpdateProfileDto) {
    try {
      await this.profileService.updateProfile(updateProfileDto);
      return {
        code: 0,
        message: '更新成功',
        data: null,
      };
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || '更新失败',
      };
    }
  }
}
