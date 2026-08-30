import { Module } from "@nestjs/common";
import { UserModule } from "@/modules/user/user.module";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
	imports: [UserModule],
	controllers: [RoleController],
	providers: [RoleService],
})
export class RoleModule {}
