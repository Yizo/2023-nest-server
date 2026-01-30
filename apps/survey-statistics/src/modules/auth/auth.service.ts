import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Cache } from "cache-manager";
import { UserService } from "../user/user.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";

import { RegisterAuthDto } from "./dto/register-auth.dto";
import { LoginAuthDto } from "./dto/login-auth.dto";

@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
	) {}

	async register(dto: RegisterAuthDto) {
		const user = await this.userService.create(dto);
		return this.signToken(user.id, user.username);
	}

	async login(dto: LoginAuthDto) {
		const user = await this.userService.findByUsername(dto.username);
		if (!user) {
			throw new UnauthorizedException("用户名或密码错误");
		}
		const valid = await bcrypt.compare(dto.password, user.password);
		if (!valid) {
			throw new UnauthorizedException("用户名或密码错误");
		}
		return this.signToken(user.id, user.username);
	}

	private async signToken(userId: string, username: string) {
		const accessToken = this.jwtService.sign({
			sub: userId,
			username,
		});

		const expiration = this.configService.get("redis").expiration;

		await this.cacheManager.set("user:" + userId, accessToken, expiration * 1000);
		return {
			accessToken,
			user: {
				id: userId,
				username,
			},
		};
	}
}
