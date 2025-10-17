import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 9000;

  // 启用cookie解析
  app.use(cookieParser());

  // 启用基于 URI 的版本控制
  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.listen(port);

  // 获取实际分配的端口
  const server = app.getHttpServer();
  const actualPort = server.address().port;

  console.log('actualPort', actualPort);
  console.log(
    `%c 🚀 Server ready at http://localhost:${actualPort}`,
    'color: red',
  );
}
bootstrap();
