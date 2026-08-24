import { registerAs } from "@nestjs/config";
import { createConfiguration } from "./environment";

/**
 * ConfigModule 加载的命名空间。
 *
 * dotenv-flow 已经加载环境文件，这里只把 process.env 整理成嵌套配置对象。
 */
export const configuration = registerAs("app", () => createConfiguration(process.env));
