import { registerAs } from "@nestjs/config";
import { createConfiguration } from "./environment";

/**
 * ConfigModule 加载的命名空间。
 *
 * dotenv-flow 已经加载环境文件，这里只返回统一整理后的嵌套配置对象。
 */
export const configuration = registerAs("app", () => createConfiguration());
