import { Module } from "@nestjs/common";
import { UserModule } from "@/modules/user/user.module";
import { DepartmentController } from "./department.controller";
import { DepartmentService } from "./department.service";

@Module({
	imports: [UserModule],
	controllers: [DepartmentController],
	providers: [DepartmentService],
})
export class DepartmentModule {}
