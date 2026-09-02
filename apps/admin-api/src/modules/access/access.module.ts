import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
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
		{ provide: APP_GUARD, useClass: PermissionGuard },
	],
	exports: [PermissionService, AccessInvalidation],
})
export class AccessModule {}
