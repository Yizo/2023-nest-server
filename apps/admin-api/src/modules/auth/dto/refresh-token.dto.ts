import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
	@ApiProperty({ description: "Refresh Token" })
	@IsString({ message: "Refresh Token 必须是字符串" })
	@Length(1, 4096, { message: "Refresh Token 长度不正确" })
	refreshToken!: string;
}
