import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TOKEN_KEY } from "@/enums/jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request) => {
					return request.headers[TOKEN_KEY] ?? "";
				},
			]),
			ignoreExpiration: false,
			secretOrKey: configService.get("jwt").secret,
		});
	}

	validate(payload: { sub: string; username: string }) {
		return {
			userId: payload.sub,
			username: payload.username,
		};
	}
}
