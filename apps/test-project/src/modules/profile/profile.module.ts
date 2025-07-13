import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { Profile } from './entities/profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile]), // 注册 Repository 实体
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
