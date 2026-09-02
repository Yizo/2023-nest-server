import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { RoleModule } from "@/modules/role/role.module";
import { MenuController } from "./menu.controller";
import { MenuDataService } from "./menu-data.service";
import { MenuService } from "./menu.service";

@Module({
	imports: [RoleModule, AccessModule],
	controllers: [MenuController],
	providers: [MenuDataService, MenuService],
})
export class MenuModule {}
