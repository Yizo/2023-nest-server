import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ErrorReportService } from "../../src/modules/error-report/error-report.service";
import { MonitorBizSystemService } from "../../src/modules/error-report/monitor-biz-system.service";
import { ClientError } from "../../src/modules/error-report/entities/client-error.entity";
import { MonitorBizSystem } from "../../src/modules/error-report/entities/monitor-biz-system.entity";
import { CLIENT_ERROR_QUEUE } from "../../src/modules/error-report/error-report.constants";
import {
	getTestConfigModule,
	getTestTypeOrmModule,
} from "../helpers/create-integration-module";
import { truncateTables } from "../helpers/db-cleanup";

describe("ErrorReportService (integration)", () => {
	let moduleRef: TestingModule;
	let service: ErrorReportService;
	let repository: Repository<ClientError>;
	let systemRepository: Repository<MonitorBizSystem>;
	let dataSource: DataSource;

	beforeAll(async () => {
		moduleRef = await Test.createTestingModule({
			imports: [
				getTestConfigModule(),
				getTestTypeOrmModule(),
				TypeOrmModule.forFeature([ClientError, MonitorBizSystem]),
			],
			providers: [ErrorReportService, MonitorBizSystemService, {
					provide: getQueueToken(CLIENT_ERROR_QUEUE),
					useValue: { add: jest.fn() },
				},
				{
					provide: Logger,
					useValue: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
				},
			],
		}).compile();

		service = moduleRef.get(ErrorReportService);
		repository = moduleRef.get(getRepositoryToken(ClientError));
		systemRepository = moduleRef.get(getRepositoryToken(MonitorBizSystem));
		dataSource = moduleRef.get(DataSource);

		await systemRepository.save(
			systemRepository.create({
				appId: "testappid0000000000000000000001",
				name: "集成测试应用",
				enabled: true,
			}),
		);
	});

	beforeEach(async () => {
		await truncateTables(dataSource, ["client_errors"]);
	});

	afterAll(async () => {
		await moduleRef?.close();
	});

	it("persist saves client error to database", async () => {
		await service.persist({
			type: "runtime-error",
			message: "integration test error",
			timestamp: 1716883200000,
			url: "http://localhost:5173/",
			stack: "Error: integration test error\n    at App.tsx:10:5",
			tags: { env: "test" },
			extra: { component: "Home" },
			appId: "testappid0000000000000000000001",
			release: "1.0.0",
			context: { userId: "u1" },
			userAgent: "jest-integration",
			ip: "127.0.0.1",
		});

		const records = await repository.find();
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			type: "runtime-error",
			message: "integration test error",
			appId: "testappid0000000000000000000001",
			userAgent: "jest-integration",
			ip: "127.0.0.1",
			stack: "Error: integration test error\n    at App.tsx:10:5",
		});
		expect(records[0].timestamp).toBe("1716883200000");
	});

	it("listEnabledSystems returns systems from monitor_biz_systems table", async () => {
		const systems = await service.listEnabledSystems();
		expect(systems.some((s) => s.appId === "testappid0000000000000000000001")).toBe(true);
	});

	it("listLogs returns paginated logs for a registered system", async () => {
		const [system] = await systemRepository.find();
		await service.persist({
			type: "runtime-error",
			message: "paged error",
			timestamp: 1716883200001,
			appId: system.appId,
		});
		await service.persist({
			type: "resource-error",
			message: "another error",
			timestamp: 1716883200002,
			appId: system.appId,
		});

		const result = await service.listLogs({ systemId: system.id, page: 1, pageSize: 1 });

		expect(result.total).toBe(2);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].appId).toBe(system.appId);
		expect(result.data[0].systemId).toBe(system.id);
	});

	it("listLogs rejects unknown system id", async () => {
		await expect(
			service.listLogs({ systemId: 99999, page: 1, pageSize: 10 }),
		).rejects.toMatchObject({ status: 404 });
	});
});
