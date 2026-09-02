import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { MenuController } from "./menu.controller";
import { MenuDataService } from "./menu-data.service";
import { MenuService } from "./menu.service";
import { RoleMenuDataService } from "./role-menu-data.service";

@Module({
	imports: [AccessModule],
	controllers: [MenuController],
	providers: [MenuDataService, MenuService, RoleMenuDataService],
	exports: [RoleMenuDataService],
})
export class MenuModule {}
