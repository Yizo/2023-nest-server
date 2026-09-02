import * as bcrypt from "bcrypt";
import {
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { EntityManager } from "@mikro-orm/postgresql";
import { randomUUID } from "node:crypto";
import type { AdminApiConfig } from "@/config";
import type { AuthenticatedUser, AuthTokenPayload } from "@/common/types";
import { RedisService } from "@/infrastructure/redis";
import { LoginDto, RefreshTokenDto, TokenResult } from "./dto";
import {
	ACCESS_TOKEN_TYPE,
	REFRESH_TOKEN_KEY_PREFIX,
	REFRESH_TOKEN_TYPE,
	REFRESH_TOKEN_USER_KEY_PREFIX,
} from "./auth.constants";
import { UserDataService } from "@/modules/user/user-data.service";

@Injectable()
export class AuthService {
	private readonly config: AdminApiConfig["auth"];

	constructor(
		private readonly em: EntityManager,
		private readonly users: UserDataService,
		private readonly jwt: JwtService,
		private readonly redis: RedisService,
		configService: ConfigService,
	) {
		this.config = configService.getOrThrow<AdminApiConfig>("app").auth;
	}

	/** 校验账号密码并签发一组新的令牌。 */
	async login(dto: LoginDto): Promise<TokenResult> {
		const userName = this.users.normalizeUserName(dto.userName);
		const user = await this.users.findUserForLogin(this.em, userName);
		if (!user || user.status !== 1 || !(await bcrypt.compare(dto.password, user.passwordHash))) {
			throw new UnauthorizedException("用户账号或密码错误");
		}

		return this.issueTokens(user.id, user.userName);
	}

	/** 校验 Refresh Token，消费旧会话并签发新令牌，防止 Refresh Token 重放。 */
	async refresh(dto: RefreshTokenDto): Promise<TokenResult> {
		const payload = await this.verifyRefreshToken(dto.refreshToken);
		await this.redis.ensureConnected();

		const client = this.redis.getClient();
		const sessionKey = this.refreshTokenKey(payload.sub, payload.jti);
		const storedUserId = await client.getDel(sessionKey);
		if (storedUserId !== String(payload.sub)) throw new UnauthorizedException("Refresh Token 已失效");
		await client.sRem(this.refreshTokenUserKey(payload.sub), payload.jti);

		const user = await this.users.findActiveUser(this.em, payload.sub);
		if (!user) throw new UnauthorizedException("用户不存在或已停用");
		return this.issueTokens(user.id, user.userName);
	}

	/** 注销当前用户的全部 Refresh Token 会话。 */
	async logout(userId: number): Promise<void> {
		await this.redis.ensureConnected();
		const client = this.redis.getClient();
		const userKey = this.refreshTokenUserKey(userId);
		const jtis = await client.sMembers(userKey);
		const sessionKeys = jtis.map((jti) => this.refreshTokenKey(userId, jti));
		if (sessionKeys.length) await client.del(sessionKeys);
		await client.del(userKey);
	}

	/** 校验 Access Token，并确认用户当前仍然启用且未软删除。 */
	async validateAccessToken(token: string): Promise<AuthenticatedUser> {
		try {
			const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token, {
				secret: this.config.accessSecret,
			});
			if (
				payload.tokenType !== ACCESS_TOKEN_TYPE ||
				!Number.isSafeInteger(payload.sub) ||
				typeof payload.jti !== "string"
			) {
				throw new UnauthorizedException("Access Token 无效");
			}

			const user = await this.users.findActiveUser(this.em, payload.sub);
			if (!user) throw new UnauthorizedException("用户不存在或已停用");
			return { id: user.id, userName: user.userName };
		} catch {
			throw new UnauthorizedException("Access Token 无效或已过期");
		}
	}

	/** 签发 Access Token 和 Refresh Token，并把 Refresh Token 会话保存到 Redis。 */
	private async issueTokens(userId: number, userName: string): Promise<TokenResult> {
		const accessJti = randomUUID();
		const refreshJti = randomUUID();
		const accessToken = await this.jwt.signAsync(
			{
				sub: userId,
				userName,
				tokenType: ACCESS_TOKEN_TYPE,
				jti: accessJti,
			},
			{ expiresIn: this.config.accessExpiresIn, jwtid: accessJti },
		);
		const refreshToken = await this.jwt.signAsync(
			{
				sub: userId,
				userName,
				tokenType: REFRESH_TOKEN_TYPE,
				jti: refreshJti,
			},
			{
				secret: this.config.refreshSecret,
				expiresIn: this.config.refreshExpiresIn,
				jwtid: refreshJti,
			},
		);

		await this.redis.ensureConnected();
		const client = this.redis.getClient();
		await client.set(this.refreshTokenKey(userId, refreshJti), String(userId), {
			EX: this.config.refreshExpiresIn,
		});
		await client.sAdd(this.refreshTokenUserKey(userId), refreshJti);
		await client.expire(this.refreshTokenUserKey(userId), this.config.refreshExpiresIn);

		return {
			accessToken,
			refreshToken,
			tokenType: "Bearer",
			expiresIn: this.config.accessExpiresIn,
			refreshExpiresIn: this.config.refreshExpiresIn,
		};
	}

	/** 校验 Refresh Token 的签名、类型、主体和唯一编号。 */
	private async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
		try {
			const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token, {
				secret: this.config.refreshSecret,
			});
			if (
				payload.tokenType !== REFRESH_TOKEN_TYPE ||
				!Number.isSafeInteger(payload.sub) ||
				typeof payload.jti !== "string"
			) {
				throw new UnauthorizedException("Refresh Token 无效");
			}
			return payload;
		} catch {
			throw new UnauthorizedException("Refresh Token 无效或已过期");
		}
	}

	private refreshTokenKey(userId: number, jti: string): string {
		return `${REFRESH_TOKEN_KEY_PREFIX}:${userId}:${jti}`;
	}

	private refreshTokenUserKey(userId: number): string {
		return `${REFRESH_TOKEN_USER_KEY_PREFIX}:${userId}`;
	}
}
