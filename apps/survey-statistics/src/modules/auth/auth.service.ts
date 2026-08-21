import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { EntityManager } from "@mikro-orm/postgresql";
import * as argon2 from "argon2";
import { createHash } from "node:crypto";
import { User } from "@/database/entities";
import { env } from "@/config/environment";
import { newId } from "@/common/utils/ids";
import type { AccessTokenPayload, RefreshTokenPayload } from "@/common/types/auth.types";
import { RedisService } from "@/infrastructure/redis/redis.service";
import { AuthErrorCode, AuthUnauthorizedException } from "@/common/errors";

interface TokenPair {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	user: {
		id: string;
		username: string;
		email: string;
		displayName: string;
		isPlatformOwner: boolean;
	};
}

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async login(usernameOrEmail: string, password: string): Promise<TokenPair> {
    // 登录只查询未删除且 active 的用户；密码永远只和 Argon2 哈希比较，不回传哈希。
    const account = usernameOrEmail.trim().toLowerCase();
    const user = await this.em.findOne(User, {
      deletedAt: null,
      $or: [{ username: account }, { email: account }],
    });
    if (!user || user.status !== "active" || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException("用户名或密码不正确");
    }
    user.lastLoginAt = new Date();
    await this.em.flush();
    return this.issueTokens(user);
  }

  async refresh(token: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: env.jwtRefreshSecret });
    } catch {
      throw new AuthUnauthorizedException(AuthErrorCode.REFRESH_TOKEN_INVALID);
    }
    if (payload.type !== "refresh") throw new AuthUnauthorizedException(AuthErrorCode.REFRESH_TOKEN_INVALID);
    await this.redis.ensureConnected();
    // getdel 实现 refresh token rotation：一个 refresh token 只能成功使用一次。
    const storedHash = await this.redis.client.getdel(this.refreshKey(payload.sub, payload.jti));
    if (!storedHash || storedHash !== this.hashToken(token)) throw new AuthUnauthorizedException(AuthErrorCode.REFRESH_TOKEN_INVALID);
    const user = await this.em.findOne(User, { id: payload.sub, deletedAt: null });
    if (!user || user.status !== "active") throw new AuthUnauthorizedException(AuthErrorCode.ACCOUNT_UNAVAILABLE);
    return this.issueTokens(user);
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, { secret: env.jwtRefreshSecret });
      await this.redis.ensureConnected();
      await this.redis.client.del(this.refreshKey(payload.sub, payload.jti));
    } catch {
      return;
    }
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    // access token 是短期 JWT；refresh token 的哈希存 Redis，服务端可以主动撤销。
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      type: "access",
    };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti: newId(), type: "refresh" };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: env.jwtAccessSecret,
      expiresIn: env.accessTokenTtl as `${number}${"s" | "m" | "h" | "d"}`,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: env.jwtRefreshSecret,
      expiresIn: env.refreshTokenTtlSeconds,
    });
    await this.redis.ensureConnected();
    await this.redis.client.set(
      this.refreshKey(user.id, refreshPayload.jti),
      this.hashToken(refreshToken),
      "EX",
      env.refreshTokenTtlSeconds,
    );
		// 返回安全的用户摘要，方便前端初始化用户状态；绝不返回 passwordHash。
		return {
			accessToken,
			refreshToken,
			expiresIn: 15 * 60,
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				displayName: user.displayName,
				isPlatformOwner: user.isPlatformOwner,
			},
		};
  }

  private refreshKey(userId: string, jti: string): string {
    return `survey:auth:refresh:${userId}:${jti}`;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
