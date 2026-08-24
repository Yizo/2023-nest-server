import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import request from "supertest";

describe("health endpoints", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const { Test } = await import("@nestjs/testing");
		const { AppModule } = await import("../../src/app.module");
		const { InfrastructureStartupService } = await import("../../src/infrastructure/infrastructure-startup.service");
		const { HealthService } = await import("../../src/modules/health");
		const { configureHttpApplication } = await import("../../src/main");
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(InfrastructureStartupService)
			.useValue({
				onApplicationBootstrap: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
			})
			.overrideProvider(HealthService)
			.useValue({
				live: jest.fn(() => ({ status: "ok" })),
				ready: jest.fn(async () => ({
					status: "ok",
					checks: { database: "ok", redis: "ok" },
				})),
			})
			.compile();
		app = moduleRef.createNestApplication();
		configureHttpApplication(app);
		await app.init();
	});

	afterAll(async () => {
		await app?.close();
	});

	it("returns a live response", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/health/live").expect(200);
		expect(response.body).toMatchObject({ code: 0, data: { status: "ok" } });
		expect(response.headers["x-request-id"]).toBeTruthy();
	});

	it("returns the package version from the root endpoint", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/").expect(200);
		expect(response.body.data).toMatchObject({ name: "admin-api", version: "1.0.0" });
	});

	it("returns a unified Chinese response for an unknown route", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/not-found").expect(404);
		expect(response.body).toMatchObject({
			code: 404,
			message: "资源不存在",
			data: null,
		});
	});

	it("reports healthy required dependencies", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(200);
		expect(response.body.data).toEqual({
			status: "ok",
			checks: { database: "ok", redis: "ok" },
		});
	});
});
