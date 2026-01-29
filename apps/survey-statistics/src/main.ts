import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	console.log("process.env.NODE_ENV", process.env.NODE_ENV);

	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix("api");

	const docConfig = new DocumentBuilder()
		.setTitle("Survey Statistics API")
		.setDescription("问卷统计平台后台接口")
		.setVersion("1.0")
		.addBearerAuth(
			{
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
			"bearer",
		)
		.build();

	const document = SwaggerModule.createDocument(app, docConfig);
	SwaggerModule.setup("api/docs", app, document, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	});

	await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 3003);

	const server = app.getHttpServer();
	const actualPort = server.address().port;

	console.log(`%c 🚀 Server ready at http://localhost:${actualPort}`, "color: red");
}

bootstrap().catch((error) => {
	console.error("Failed to bootstrap survey-statistics", error);
	process.exit(1);
});
