import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { UserModule } from "@/modules/user/user.module";
import { RoleController } from "./role.controller";
import { RoleGrantCommand } from "./role-grant.command";
import { RoleMenuDataService } from "./role-menu-data.service";
import { RoleService } from "./role.service";

@Module({
	imports: [UserModule, AccessModule],
	controllers: [RoleController],
	providers: [RoleService, RoleMenuDataService, RoleGrantCommand],
	exports: [RoleGrantCommand],
})
export class RoleModule {}
