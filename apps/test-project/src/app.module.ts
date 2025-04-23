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
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     type: 'mysql',
    //     autoLoadEntities: true,
    //     migrationsRun: true,
    //     host: configService.get('DB_HOST'),
    //     port: configService.get('DB_PORT'),
    //     username: configService.get('DB_USER'),
    //     password: configService.get('DB_PASSWD'),
    //     database: configService.get('DB_DATABASE'),
    //     timezone: '+08:00',
    //     synchronize: true,
    //   }),
    // }),
    XueXiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
