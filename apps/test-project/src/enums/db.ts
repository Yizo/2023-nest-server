const path = 'db';

export const DbConfigKey = {
  TYPE: `${path}.type`,
  AUTO_LOAD_ENTITIES: `${path}.autoLoadEntities`,
  MIGRATIONS_RUN: `${path}.migrationsRun`,
  HOST: `${path}.host`,
  PORT: `${path}.port`,
  USERNAME: `${path}.username`,
  PASSWORD: `${path}.password`,
  DATABASE: `${path}.database`,
  TIMEZONE: `${path}.timezone`,
  SYNCHRONIZE: `${path}.synchronize`,
  LOGGING: `${path}.logging`,
  LOGGER: `${path}.logger`,
} as const;
