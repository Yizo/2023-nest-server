import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { JwtErrorCode, JwtErrorMessages } from "../src/enums/jwt";
import { ClientError } from "../src/modules/error-report/entities/client-error.entity";
import { createTestApp, truncateTables, waitForRecord } from "./helpers";

const now = () => Date.now();

describe("ErrorReport (e2e)", () => {
	let app: INestApplication;
	let dataSource: DataSource;

	beforeAll(async () => {
		app = await createTestApp();
		dataSource = app.get(DataSource);
	});

	beforeEach(async () => {
		await truncateTables(dataSource, ["client_errors"]);
	});

	afterAll(async () => {
		await app.close();
	});

	it("accepts valid batch payload", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/error-report")
			.send([
				{
					type: "runtime-error",
					message: "e2e test error",
					timestamp: now(),
					appId: "e2e-app",
					url: "http://localhost:5173/",
				},
			])
			.expect(201);

		expect(response.body).toMatchObject({
			code: 0,
			data: { accepted: true, count: 1 },
		});
	});

	it("persists error report to database asynchronously", async () => {
		const message = `e2e-async-${Date.now()}`;

		await request(app.getHttpServer())
			.post("/api/error-report")
			.send([
				{
					type: "runtime-error",
					message,
					timestamp: now(),
					appId: "e2e-app",
				},
			])
			.expect(201);

		const record = await waitForRecord(() =>
			dataSource.getRepository(ClientError).findOne({ where: { message } }),
		);

		expect(record.appId).toBe("e2e-app");
		expect(record.type).toBe("runtime-error");
	});

	it("returns 400 for invalid payload without message", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/error-report")
			.send([{ type: "runtime-error", timestamp: now(), appId: "e2e-app" }])
			.expect(400);

		expect(response.body.code).toBe(400);
	});

	it("returns 400 when timestamp is missing", async () => {
		await request(app.getHttpServer())
			.post("/api/error-report")
			.send([
				{
					type: "runtime-error",
					message: "no timestamp",
					appId: "e2e-app",
				},
			])
			.expect(400);
	});

	it("accepts fetch-style application/json single object", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/error-report")
			.set("Content-Type", "application/json")
			.send({
				type: "request-error",
				message: "fetch single object",
				timestamp: now(),
				appId: "e2e-app",
			})
			.expect(201);

		expect(response.body.data).toMatchObject({ accepted: true, count: 1 });
	});

	it("accepts sendBeacon-style text/plain JSON array", async () => {
		const payload = [
			{
				type: "request-error",
				message:
					"Request failed: GET http://localhost:3003/api/dictionary/types/list?page=1&pageSize=10",
				timestamp: 1780028400510,
				url: "http://localhost:3003/api/dictionary/types/list?page=1&pageSize=10",
				extra: {
					method: "GET",
					status: 401,
					statusText: "Unauthorized",
				},
				appId: "survey-admin",
				release: "0.0.0",
				context: { page: "/admin/dictionary", env: "development" },
			},
		];

		const response = await request(app.getHttpServer())
			.post("/api/error-report")
			.set("Content-Type", "text/plain")
			.send(JSON.stringify(payload))
			.expect(201);

		expect(response.body).toMatchObject({
			code: 0,
			data: { accepted: true, count: 1 },
		});
	});

	it("allows public POST without Authorization", async () => {
		await request(app.getHttpServer())
			.post("/api/error-report")
			.send([
				{
					type: "runtime-error",
					message: "public route",
					timestamp: now(),
					appId: "e2e-app",
				},
			])
			.expect(201);
	});

	it("returns 401 with code 1001 for protected logs without token", async () => {
		const response = await request(app.getHttpServer())
			.get("/api/error-report/logs")
			.query({ systemId: 1, page: 1, pageSize: 10 })
			.expect(401);

		expect(response.body).toMatchObject({
			code: JwtErrorCode.NO_TOKEN_PROVIDED,
			message: JwtErrorMessages[JwtErrorCode.NO_TOKEN_PROVIDED],
		});
	});
});
