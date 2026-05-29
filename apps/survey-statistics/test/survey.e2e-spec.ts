import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { createTestApp, registerAndLogin, truncateTables } from "./helpers";

describe("Survey (e2e)", () => {
	let app: INestApplication;
	let dataSource: DataSource;
	let accessToken: string;

	const surveyPayload = {
		title: "E2E Survey",
		description: "created in e2e",
		questions: [
			{
				id: "q1",
				text: "Question 1",
				type: "single",
				options: ["A", "B"],
			},
		],
	};

	beforeAll(async () => {
		app = await createTestApp();
		dataSource = app.get(DataSource);
		const auth = await registerAndLogin(app);
		accessToken = auth.accessToken;
	});

	beforeEach(async () => {
		await truncateTables(dataSource, ["survey_responses", "surveys"]);
	});

	afterAll(async () => {
		await app.close();
	});

	it("creates survey via API", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/surveys")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(surveyPayload)
			.expect(201);

		expect(response.body.code).toBe(0);
		expect(response.body.data.title).toBe(surveyPayload.title);
		expect(response.body.data.ownerId).toBeDefined();
	});

	it("gets survey detail by id", async () => {
		const created = await request(app.getHttpServer())
			.post("/api/surveys")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(surveyPayload)
			.expect(201);

		const surveyId = created.body.data.id;

		const detail = await request(app.getHttpServer())
			.get(`/api/surveys/${surveyId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.expect(200);

		expect(detail.body.data.id).toBe(surveyId);
		expect(detail.body.data.title).toBe(surveyPayload.title);
	});

	it("lists surveys including created one", async () => {
		const created = await request(app.getHttpServer())
			.post("/api/surveys")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(surveyPayload)
			.expect(201);

		const list = await request(app.getHttpServer())
			.get("/api/surveys")
			.set("Authorization", `Bearer ${accessToken}`)
			.expect(200);

		const ids = list.body.data.map((item: { id: string }) => item.id);
		expect(ids).toContain(created.body.data.id);
	});
});
