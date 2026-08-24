import { createConfiguration, environmentFilesForMode } from "../../src/config";

const environment = {
	NODE_ENV: "test",
	PORT: "3004",
	APP_NAME: "admin-api-test",
	DATABASE_URL: "postgresql://admin:password@127.0.0.1:15432/admin_api",
	REDIS_URL: "redis://:password@127.0.0.1:16379/0",
	CORS_ORIGINS: "http://localhost:5173,http://localhost:4173",
	CORS_CREDENTIALS: "true",
	SWAGGER_ENABLED: "true",
	LOG_LEVEL: "debug",
	LOG_DIR: "logs",
} as NodeJS.ProcessEnv;

describe("environment configuration", () => {
	it("selects Vite-style files for development and test modes", () => {
		expect(environmentFilesForMode("development")).toEqual([
			".env",
			".env.local",
			".env.development",
			".env.development.local",
		]);
		expect(environmentFilesForMode("test")).toEqual([
			".env",
			".env.local",
			".env.test",
			".env.test.local",
		]);
	});

	it("does not select local files for production", () => {
		expect(environmentFilesForMode("production")).toEqual([
			".env",
			".env.production",
		]);
	});

	it("creates the nested configuration object consumed by modules", () => {
		const config = createConfiguration(environment);

		expect(config).toMatchObject({
			app: { name: "admin-api-test", nodeEnv: "test", port: 3004 },
			database: { url: environment.DATABASE_URL },
			redis: { url: environment.REDIS_URL },
			cors: {
				origins: ["http://localhost:5173", "http://localhost:4173"],
				credentials: true,
			},
			swaggerEnabled: true,
			logging: {
				level: "debug",
				dir: "logs",
				maxSize: "20m",
				maxFiles: "14d",
			},
		});
	});

	it("keeps empty production connection values for runtime libraries", () => {
		const config = createConfiguration({
			...environment,
			NODE_ENV: "production",
			DATABASE_URL: "",
			REDIS_URL: "",
		});

		expect(config.database.url).toBe("");
		expect(config.redis.url).toBe("");
	});
});
