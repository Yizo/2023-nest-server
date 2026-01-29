"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const typeorm_1 = require("@nestjs/typeorm");
const redis_1 = require("@keyv/redis");
const configuration_1 = require("../config/configuration");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./modules/auth/auth.module");
const survey_module_1 = require("./modules/survey/survey.module");
const user_module_1 = require("./modules/user/user.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_transform_interceptor_1 = require("./common/interceptors/response-transform.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const jwt_guard_1 = require("./modules/auth/jwt/jwt.guard");
let AppModule = class AppModule {
};
AppModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const db = config.get("db");
                    return {
                        type: db.type,
                        host: db.host,
                        port: db.port,
                        username: db.username,
                        password: db.password,
                        database: db.database,
                        timezone: db.timezone,
                        synchronize: db.synchronize,
                        logging: db.logging,
                        logger: db.logger,
                        createForeignKeyConstraints: db.createForeignKeyConstraints,
                        autoLoadEntities: true,
                        entities: [__dirname + "/**/*.entity{.ts,.js}"],
                    };
                },
            }),
            cache_manager_1.CacheModule.registerAsync({
                inject: [config_1.ConfigService],
                isGlobal: true,
                useFactory: (config) => {
                    const redis = config.get("redis");
                    const store = new redis_1.default({
                        url: `redis://${redis.host}:${redis.port}`,
                        password: redis.password?.toString(),
                    });
                    store.on("error", (error) => {
                        console.error("KeyvRedis Error", error);
                    });
                    return { stores: [store] };
                },
            }),
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            survey_module_1.SurveyModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_PIPE,
                useValue: new common_1.ValidationPipe({
                    whitelist: true,
                    forbidNonWhitelisted: false,
                }),
            },
            {
                provide: core_1.APP_FILTER,
                useClass: http_exception_filter_1.HttpExceptionFilter,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: logging_interceptor_1.LoggingInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: response_transform_interceptor_1.ResponseTransformInterceptor,
            },
        ],
        exports: [app_service_1.AppService],
    })
], AppModule);
exports.AppModule = AppModule;
