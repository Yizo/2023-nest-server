import { Module } from "@nestjs/common";
import { IdentityController } from "./identity.controller";
import { IdentityQueries } from "./identity.queries";
import { IdentityService } from "./identity.service";
import { AuthorizationService } from "./authorization.service";

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentityQueries, AuthorizationService],
  exports: [IdentityService, AuthorizationService],
})
export class IdentityModule {}
