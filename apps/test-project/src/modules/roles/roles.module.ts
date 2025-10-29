import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/roles.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsModule } from '@/modules/permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
