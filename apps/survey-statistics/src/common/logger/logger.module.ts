import { Global, Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { createWinstonOptions } from "./logger.options";

/** 全局日志模块：控制台输出 + 可选的本地滚动文件。 */
@Global()
@Module({
  imports: [WinstonModule.forRoot(createWinstonOptions())],
  exports: [WinstonModule],
})
export class AppLoggerModule {}
