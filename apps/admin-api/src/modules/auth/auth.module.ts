import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { AdminApiConfig } from "@/config";
import { UserModule } from "@/modules/user/user.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

function requiredSecret(value: string, fieldName: string): string {
	if (value.length < 32) throw new Error(`${fieldName} 必须配置至少 32 个字符的密钥`);
	return value;
}

@Module({
	imports: [
		ConfigModule,
		UserModule,
		JwtModule.registerAsync({
			global: true,
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const config = configService.getOrThrow<AdminApiConfig>("app").auth;
				requiredSecret(config.refreshSecret, "JWT_REFRESH_SECRET");
				return {
					secret: requiredSecret(config.accessSecret, "JWT_ACCESS_SECRET"),
					signOptions: { expiresIn: config.accessExpiresIn },
				};
			},
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, AuthGuard],
	exports: [AuthService, AuthGuard],
})
export class AuthModule {}
