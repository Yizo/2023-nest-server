import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 9000;

  // 启用cookie解析
  app.use(cookieParser());
  // 启用session支持
  app.use(
    session({
      secret: 'keyboard cat', // 用于签名session ID的密钥
      resave: false, // 避免每次请求都强制保存session
      saveUninitialized: true, // 允许存储未初始化的session
      cookie: {
        secure: false, // 允许HTTP协议传输cookie
        sameSite: 'strict', // 防御CSRF攻击
        httpOnly: true, // 禁止客户端脚本访问
        maxAge: 24 * 60 * 60 * 1000, // 设置有效期（示例24小时）
      },
    }),
  );

  await app.listen(port);

  // 获取实际分配的端口
  const server = app.getHttpServer();
  const actualPort = server.address().port;
  console.log(
    `%c 🚀 Server ready at http://localhost:${actualPort}`,
    'color: red',
  );
}
bootstrap();
