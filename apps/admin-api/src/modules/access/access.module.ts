import { Module } from "@nestjs/common";
import { AccessController } from "./access.controller";
import { AccessInvalidation } from "./access-invalidation.service";
import { PermissionCacheService } from "./permission-cache.service";
import { PermissionGuard } from "./permission.guard";
import { PermissionService } from "./permission.service";

@Module({
	controllers: [AccessController],
	providers: [
		PermissionCacheService,
		PermissionService,
		AccessInvalidation,
		PermissionGuard,
	],
	exports: [PermissionService, AccessInvalidation, PermissionGuard],
})
export class AccessModule {}
