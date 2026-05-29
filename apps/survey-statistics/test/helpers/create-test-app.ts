import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { CustomValidationPipe } from "../../src/common/pipes/validation.pipe";
import { useReportBodyParsers } from "../../src/modules/error-report/report-body.middleware";

export async function createTestApp(): Promise<INestApplication> {
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	const app = moduleRef.createNestApplication();
	app.setGlobalPrefix("api");
	useReportBodyParsers(app);
	app.useGlobalPipes(new CustomValidationPipe());

	await app.init();
	return app;
}

export async function registerAndLogin(
	app: INestApplication,
	suffix = Date.now().toString(),
) {
	const payload = {
		username: `testuser_${suffix}`,
		email: `test_${suffix}@example.com`,
		password: "123456",
	};

	const request = require("supertest");
	const response = await request(app.getHttpServer())
		.post("/api/auth/register")
		.send(payload)
		.expect(201);

	const body = response.body;
	return {
		accessToken: body.data.accessToken as string,
		user: body.data.user,
	};
}
