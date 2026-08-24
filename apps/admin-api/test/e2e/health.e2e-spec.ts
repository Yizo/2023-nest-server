import type { INestApplication } from "@nestjs/common";
import request from "supertest";

const runE2e = process.env.RUN_E2E === "true";

(runE2e ? describe : describe.skip)("health endpoints", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const { Test } = await import("@nestjs/testing");
		const { AppModule } = await import("../../src/app.module");
		const { configureHttpApplication } = await import("../../src/main");
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

	it("returns a unified Chinese response for an unknown route", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/not-found").expect(404);
		expect(response.body).toMatchObject({
			code: 404,
			message: "资源不存在",
			data: null,
		});
	});

	it("reports readiness or dependency degradation", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/health/ready");
		expect([200, 503]).toContain(response.status);
		if (response.status === 200) {
			expect(response.body.data).toEqual({
				status: "ok",
				checks: { database: "ok", redis: "ok" },
			});
		} else {
			expect(response.body.data.status).toBe("degraded");
			expect(["ok", "failed"]).toContain(response.body.data.checks.database);
			expect(["ok", "failed"]).toContain(response.body.data.checks.redis);
			expect(Object.values(response.body.data.checks)).toContain("failed");
		}
	});
});
