import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from './entities/permissions.entity';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { CaslAbilityFactory } from './casl-ability.factory';
import { QueryBuilderModule } from '@/common/query-builder';

@Module({
  imports: [TypeOrmModule.forFeature([Permission]), QueryBuilderModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, CaslAbilityFactory],
  exports: [PermissionsService, CaslAbilityFactory],
})
export class PermissionsModule {}
