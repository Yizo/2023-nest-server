import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { UserModule } from "@/modules/user/user.module";
import { SystemInitializationController } from "./system-initialization.controller";
import { SystemInitializationService } from "./system-initialization.service";

@Module({
	imports: [UserModule, AccessModule],
	controllers: [SystemInitializationController],
	providers: [SystemInitializationService],
})
export class SystemInitializationModule {}
