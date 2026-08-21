import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { EntityManager } from "@mikro-orm/postgresql";
import { env } from "@/config/environment";
import { User } from "@/database/entities";
import type { AccessTokenPayload, AuthenticatedUser } from "@/common/types/auth.types";
import { AuthErrorCode, AuthUnauthorizedException } from "@/common/errors";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly em: EntityManager) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: env.jwtAccessSecret });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    // JWT 只保存最小身份信息；每次请求仍回数据库确认用户未被禁用或删除。
    if (payload.type !== "access") throw new AuthUnauthorizedException(AuthErrorCode.ACCESS_TOKEN_INVALID);
    const user = await this.em.findOne(User, { id: payload.sub, deletedAt: null }, {
      fields: ["id", "username", "email", "displayName", "isPlatformOwner", "status"],
    });
    if (!user || user.status !== "active") throw new AuthUnauthorizedException(AuthErrorCode.ACCOUNT_UNAVAILABLE);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      isPlatformOwner: user.isPlatformOwner,
    };
  }
}
