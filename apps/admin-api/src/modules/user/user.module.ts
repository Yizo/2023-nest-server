import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserDataService } from "./user-data.service";
import { UserService } from "./user.service";

@Module({
	controllers: [UserController],
	providers: [UserDataService, UserService],
	exports: [UserDataService],
})
export class UserModule {}
