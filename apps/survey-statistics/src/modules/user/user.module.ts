import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Role } from "@/modules/role/entities/role.entity";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { Profile } from "@/modules/profile/profile.entity";

@Module({
	imports: [TypeOrmModule.forFeature([User, Role, Profile])],
	providers: [UserService],
	exports: [UserService],
	controllers: [UserController],
})
export class UserModule {}
