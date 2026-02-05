import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("SurveyStatisticsApp (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = module.createNestApplication();
		app.setGlobalPrefix("api");
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it("/health (GET)", () => {
		return request(app.getHttpServer()).get("/api/health").expect(200);
	});
});
