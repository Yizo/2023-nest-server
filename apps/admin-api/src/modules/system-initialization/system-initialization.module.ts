import { Module } from "@nestjs/common";
import { SystemInitializationController } from "./system-initialization.controller";
import { SystemInitializationService } from "./system-initialization.service";

@Module({
	controllers: [SystemInitializationController],
	providers: [SystemInitializationService],
})
export class SystemInitializationModule {}
