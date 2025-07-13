import { Module, NestModule, RequestMethod } from '@nestjs/common';
import type { MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Profile } from '../profile/entities/profile.entity'; // 引入 Profile 实体
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserMiddleware } from './user.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile]), // 注册 User 实体
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserMiddleware).forRoutes({
      path: 'user', // 只对 /user 路径生效,
      method: RequestMethod.ALL, // 所有请求方法
    }); // 注册 UserMiddleware
  }
}
