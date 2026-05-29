import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Request } from "express";
import { ExtractJwt } from "passport-jwt";
import { UserService } from "../user/user.service";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "@/modules/redis/redis.service";
import { TOKEN_KEY } from "@/enums/jwt";
import { RegisterAuthDto } from "./dto/register-auth.dto";
import { LoginAuthDto } from "./dto/login-auth.dto";

@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private redisService: RedisService,
	) {}

	async register(dto: RegisterAuthDto) {
		const user = await this.userService.create(dto);
		return this.signToken(user.id, user.username);
	}

	async login(dto: LoginAuthDto) {
		const user = await this.userService.findUserByIdentifier("username", dto.username);
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

		const cachedToken = await this.redisService.set(
			"token:" + userId,
			accessToken,
			expiration * 1000,
		);

		console.log(cachedToken, "cachedToken");

		return {
			accessToken,
			user: {
				id: userId,
				username,
			},
		};
	}

	/**
	 * 退出登录：不依赖 JWT 守卫，token 过期或 Redis 已失效时仍可调用。
	 * 若请求中带 token，则尽力解析 userId 并删除 Redis 中的会话。
	 */
	async logoutFromRequest(req: Request) {
		const userId = this.extractUserIdFromRequest(req);
		if (userId) {
			await this.redisService.del(`token:${userId}`);
		}
		return true;
	}

	private extractUserIdFromRequest(req: Request): string | undefined {
		const token = this.extractToken(req);
		if (!token) {
			return undefined;
		}

		try {
			const payload = this.jwtService.verify<{ sub: string }>(token, {
				secret: this.configService.get<string>("jwt.secret"),
				ignoreExpiration: true,
			});
			return payload.sub;
		} catch {
			const decoded = this.jwtService.decode(token);
			if (decoded && typeof decoded === "object" && "sub" in decoded) {
				return String((decoded as { sub: string }).sub);
			}
			return undefined;
		}
	}

	private extractToken(req: Request): string | undefined {
		const fromBearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
		if (fromBearer) {
			return fromBearer;
		}
		const headerToken = req.headers[TOKEN_KEY];
		return typeof headerToken === "string" && headerToken ? headerToken : undefined;
	}
}
