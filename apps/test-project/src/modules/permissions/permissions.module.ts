import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from './entities/permissions.entity';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { CaslAbilityFactory } from './casl-ability.factory';

@Module({
  imports: [TypeOrmModule.forFeature([Permission])],
  controllers: [PermissionsController],
  providers: [PermissionsService, CaslAbilityFactory],
  exports: [PermissionsService, CaslAbilityFactory],
})
export class PermissionsModule {}
