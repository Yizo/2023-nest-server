import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SystemService } from "./system.service";
import { SystemController } from "./system.controller";
import { System } from "./entities/system.entity";

@Module({
	imports: [TypeOrmModule.forFeature([System])],
	controllers: [SystemController],
	providers: [SystemService],
	exports: [SystemService],
})
export class SystemModule {}
