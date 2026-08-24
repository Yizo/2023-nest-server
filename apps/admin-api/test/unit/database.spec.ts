import { jest } from "@jest/globals";
import { createConfiguration } from "../../src/config";
import { InfrastructureStartupService } from "../../src/infrastructure/infrastructure-startup.service";
import { createMikroOrmOptions } from "../../src/infrastructure/database";

describe("database configuration", () => {
	it("keeps ordinary ORM connections from implicitly changing schema", () => {
		const config = createConfiguration({
			NODE_ENV: "production",
			APP_NAME: "admin-api",
			DATABASE_URL: "postgresql://runtime:password@127.0.0.1:5432/admin_api",
			REDIS_URL: "redis://:password@127.0.0.1:6379/0",
		});
		const options = createMikroOrmOptions(config);

		expect(options.ensureDatabase).toBe(false);
		expect(options.ensureIndexes).toBe(false);
		expect(options.allowGlobalContext).toBe(false);
		expect(options.entities).toEqual([]);
		expect(options.debug).toBe(false);
		expect(options.migrations).toMatchObject({
			transactional: true,
			allOrNothing: true,
			dropTables: false,
		});
	});

	it("updates schema only when synchronize is enabled", async () => {
		const update = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
		const orm = {
			connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			schema: { update },
			em: {
				getConnection: () => ({
					execute: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
				}),
			},
		};
		const redis = {
			assertRuntimeReady: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
		};
		const development = createConfiguration({
			NODE_ENV: "development",
			DATABASE_URL: "postgresql://runtime:password@127.0.0.1:5432/admin_api",
			REDIS_URL: "redis://:password@127.0.0.1:6379/0",
		});
		const production = createConfiguration({
			NODE_ENV: "production",
			DATABASE_URL: "postgresql://runtime:password@127.0.0.1:5432/admin_api",
			REDIS_URL: "redis://:password@127.0.0.1:6379/0",
		});
		const configService = {
			getOrThrow: jest.fn(() => development),
		};

		await new InfrastructureStartupService(
			orm as never,
			redis as never,
			configService as never,
		).onApplicationBootstrap();
		expect(update).toHaveBeenCalledTimes(1);

		update.mockClear();
		configService.getOrThrow.mockReturnValue(production);
		await new InfrastructureStartupService(
			orm as never,
			redis as never,
			configService as never,
		).onApplicationBootstrap();
		expect(update).not.toHaveBeenCalled();
	});
});
