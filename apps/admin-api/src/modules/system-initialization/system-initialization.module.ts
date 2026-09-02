import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { RoleModule } from "@/modules/role/role.module";
import { UserModule } from "@/modules/user/user.module";
import { SystemInitializationController } from "./system-initialization.controller";
import { SystemInitializationService } from "./system-initialization.service";

@Module({
	imports: [UserModule, RoleModule, AccessModule],
	controllers: [SystemInitializationController],
	providers: [SystemInitializationService],
})
export class SystemInitializationModule {}
