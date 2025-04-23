import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '../config/configuration'
import { TypeOrmModule } from '@nestjs/typeorm';
import { XueXiModule } from './xue-xi/xue-xi.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // 以env文件的方法
      // envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
    }) as DynamicModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      autoLoadEntities: true,
      migrationsRun: true,
      host: 'localhost',
      port: 3309,
      username: 'app_user',
      password: 'app_password',
      database: 'dev',
      timezone: '+08:00',
      synchronize: true,
      logging: true,
      logger: 'advanced-console',
    }),
    XueXiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
