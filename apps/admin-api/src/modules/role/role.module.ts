import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { MenuModule } from "@/modules/menu/menu.module";
import { UserModule } from "@/modules/user/user.module";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
	imports: [MenuModule, UserModule, AccessModule],
	controllers: [RoleController],
	providers: [RoleService],
})
export class RoleModule {}
