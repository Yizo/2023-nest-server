import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SystemService } from "./system.service";
import { SystemController } from "./system.controller";
import { System } from "./entities/system.entity";
import { UserModule } from "../user/user.module";
import { RoleModule } from "../role/role.module";
@Module({
	imports: [TypeOrmModule.forFeature([System]), UserModule, RoleModule],
	controllers: [SystemController],
	providers: [SystemService],
	exports: [SystemService],
})
export class SystemModule {}
