import { Module } from "@nestjs/common";
import { AccessModule } from "@/modules/access/access.module";
import { UserController } from "./user.controller";
import { UserDataService } from "./user-data.service";
import { UserQuery } from "./user-query.service";
import { UserService } from "./user.service";

@Module({
	imports: [AccessModule],
	controllers: [UserController],
	providers: [UserDataService, UserQuery, UserService],
	exports: [UserQuery],
})
export class UserModule {}
