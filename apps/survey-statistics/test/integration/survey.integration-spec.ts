import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { SurveyService } from "../../src/modules/survey/survey.service";
import { Survey } from "../../src/modules/survey/entities/survey.entity";
import { SurveyResponse } from "../../src/modules/survey/entities/survey-response.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
	getTestConfigModule,
	getTestTypeOrmModule,
} from "../helpers/create-integration-module";
import { truncateTables } from "../helpers/db-cleanup";

describe("SurveyService (integration)", () => {
	let moduleRef: TestingModule;
	let service: SurveyService;
	let dataSource: DataSource;

	const createDto = {
		title: "Integration Survey",
		description: "desc",
		questions: [
			{
				id: "q1",
				text: "Question 1",
				type: "single" as const,
				options: ["yes", "no"],
			},
		],
	};

	beforeAll(async () => {
		moduleRef = await Test.createTestingModule({
			imports: [
				getTestConfigModule(),
				getTestTypeOrmModule(),
				TypeOrmModule.forFeature([Survey, SurveyResponse]),
			],
			providers: [SurveyService],
		}).compile();

		service = moduleRef.get(SurveyService);
		dataSource = moduleRef.get(DataSource);
	});

	beforeEach(async () => {
		await truncateTables(dataSource, ["survey_responses", "surveys"]);
	});

	afterAll(async () => {
		await moduleRef?.close();
	});

	it("creates and finds survey by id", async () => {
		const created = await service.create("owner-1", createDto);
		const found = await service.findById(created.id);

		expect(found.title).toBe(createDto.title);
		expect(found.ownerId).toBe("owner-1");
		expect(found.status).toBe("draft");
	});

	it("throws ForbiddenException when updating as non-owner", async () => {
		const created = await service.create("owner-1", createDto);

		await expect(
			service.update(created.id, "other-user", { title: "Hacked" }),
		).rejects.toThrow(ForbiddenException);
	});

	it("removes survey and throws NotFoundException afterward", async () => {
		const created = await service.create("owner-1", createDto);
		await service.remove(created.id, "owner-1");

		await expect(service.findById(created.id)).rejects.toThrow(
			NotFoundException,
		);
	});

	it("submits response and returns statistics", async () => {
		const created = await service.create("owner-1", createDto);
		await service.submitResponse("user-1", created.id, {
			answers: { q1: "yes" },
		});
		await service.submitResponse("user-2", created.id, {
			answers: { q1: "yes", q2: "no" },
		});

		const stats = await service.getStatistics(created.id);
		expect(stats.totalResponses).toBe(2);
		expect(stats.answers.q1.yes).toBe(2);
		expect(stats.answers.q2.no).toBe(1);
	});
});
