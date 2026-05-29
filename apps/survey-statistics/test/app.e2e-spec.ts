import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { createTestApp } from "./helpers";

describe("SurveyStatisticsApp (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		app = await createTestApp();
	});

	afterAll(async () => {
		await app.close();
	});

	it("/health (GET)", () => {
		return request(app.getHttpServer()).get("/api/health").expect(200);
	});
});
