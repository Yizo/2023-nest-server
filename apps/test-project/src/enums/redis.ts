const path = 'redis';

export const RedisConfig = {
  HOST: `${path}.host`,
  PORT: `${path}.port`,
  PASSWORD: `${path}.password`,
  EXPIRATION: `${path}.expiration`,
} as const;
