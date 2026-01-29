import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/roles.entity';
import { Permission } from '@/modules/permissions/entities/permissions.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { QueryBuilderModule } from '@/common/query-builder';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission]),
    PermissionsModule,
    QueryBuilderModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
