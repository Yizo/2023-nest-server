import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtErrorCode, JwtErrorMessages, TOKEN_KEY } from "@/enums/jwt";
import { RedisService } from "@/modules/redis/redis.service";
import { UserService } from "@/modules/user/user.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly configService: ConfigService,
		private readonly userService: UserService,
		private redisService: RedisService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request) => {
					return request.headers[TOKEN_KEY] ?? "";
				},
			]),
			// 不验证 JWT token 的过期时间, 转为验证 Redis 中的 token 是否过期
			ignoreExpiration: true,
			// 将请求对象传递给验证回调函数
			passReqToCallback: true,
			secretOrKey: configService.get("jwt").secret,
		});
	}

	async validate(request: Request, payload: { sub: string; username: string }) {
		const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
		const cachedToken = await this.redisService.get(`token:${payload.sub}`);
		if (!cachedToken) {
			throw new UnauthorizedException({
				message: JwtErrorMessages[JwtErrorCode.TOKEN_EXPIRED],
				code: JwtErrorCode.TOKEN_EXPIRED,
			});
		}
		if (cachedToken !== token) {
			throw new UnauthorizedException({
				message: JwtErrorMessages[JwtErrorCode.TOKEN_INVALID],
				code: JwtErrorCode.TOKEN_INVALID,
			});
		}
		const user = await this.userService.findUserByIdentifier("id", payload.sub);
		if (!user) {
			throw new UnauthorizedException("用户不存在");
		}
		// 刷新token时间
		await this.redisService.set(
			`token:${payload.sub}`,
			token,
			this.configService.get("redis").expiration * 1000,
		);
		return {
			userId: payload.sub,
			username: payload.username,
		};
	}
}
