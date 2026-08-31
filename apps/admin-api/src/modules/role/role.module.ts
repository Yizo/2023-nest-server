import { Module } from "@nestjs/common";
import { MenuModule } from "@/modules/menu/menu.module";
import { UserModule } from "@/modules/user/user.module";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
	imports: [MenuModule, UserModule],
	controllers: [RoleController],
	providers: [RoleService],
})
export class RoleModule {}
