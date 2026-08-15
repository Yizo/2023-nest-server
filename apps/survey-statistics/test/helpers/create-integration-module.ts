import { join } from "path";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { EntitySchema } from "typeorm";
import configuration from "../../src/config/configuration";

type EntityClass = Function | EntitySchema;

export function getTestEntitiesGlob() {
	return [join(__dirname, "../../src/modules/**/*.entity{.ts,.js}")];
}

export function getTestTypeOrmModule(entities?: EntityClass[]) {
	return TypeOrmModule.forRootAsync({
		imports: [ConfigModule],
		inject: [ConfigService],
		useFactory: (config: ConfigService) => {
			const db = config.get("db");
			return {
				type: db.type,
				host: db.host,
				port: db.port,
				username: db.username,
				password: db.password,
				database: db.database,
				...(db.timezone ? { timezone: db.timezone } : {}),
				synchronize: db.synchronize,
				logging: db.logging,
				createForeignKeyConstraints: db.createForeignKeyConstraints,
				autoLoadEntities: true,
				entities: entities ?? getTestEntitiesGlob(),
			};
		},
	});
}

export function getTestConfigModule() {
	return ConfigModule.forRoot({
		isGlobal: true,
		load: [configuration],
	});
}
