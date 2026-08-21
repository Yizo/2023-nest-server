import { Migrator } from "@mikro-orm/migrations";
import { ReflectMetadataProvider } from "@mikro-orm/decorators/legacy";
import { join } from "node:path";
import { defineConfig, MikroORM } from "@mikro-orm/postgresql";
import { env } from "@/config/environment";
import { ENTITIES } from "@/database/entities";

export function createMikroOrmOptions() {
  return defineConfig({
    clientUrl: env.databaseUrl,
    entities: [...ENTITIES],
    metadataProvider: ReflectMetadataProvider,
    extensions: [Migrator],
    // 禁止在请求外共享同一个 EntityManager，迫使代码使用 RequestContext/fork，避免串数据。
    allowGlobalContext: false,
    debug: env.nodeEnv === "development" && process.env.DB_DEBUG === "true",
    // migration 是唯一的结构变更入口；应用启动不会 synchronize。
    migrations: {
      path: join(__dirname, "../migrations"),
      pathTs: join(__dirname, "../migrations"),
      tableName: "app_migrations",
      transactional: true,
      allOrNothing: true,
      emit: "ts",
    },
  });
}

export async function initMikroOrm(): Promise<MikroORM> {
  return MikroORM.init(createMikroOrmOptions() as never) as unknown as Promise<MikroORM>;
}
