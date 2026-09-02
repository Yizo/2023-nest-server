import { ApiProperty } from "@nestjs/swagger";

export class TokenResult {
	@ApiProperty({ description: "Access Token" })
	accessToken!: string;

	@ApiProperty({ description: "Refresh Token" })
	refreshToken!: string;

	@ApiProperty({ description: "Token 类型", example: "Bearer" })
	tokenType!: "Bearer";

	@ApiProperty({ description: "Access Token 有效期，单位秒" })
	expiresIn!: number;

	@ApiProperty({ description: "Refresh Token 有效期，单位秒" })
	refreshExpiresIn!: number;
}
