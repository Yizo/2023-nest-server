const path = 'jwt';

export const JwtConfig = {
  SECRET: `${path}.secret`,
  EXPIRATION: `${path}.expiration`,
  REFRESH_TOKEN_EXPIRATION: `${path}.refreshTokenExpiration`,
  ENABLE: `${path}.enable`,
} as const;
