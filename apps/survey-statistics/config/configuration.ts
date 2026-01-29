import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";
import { merge } from "lodash";

export default () => {
	const env = process.env.NODE_ENV || "development";
	const configDir = __dirname;

	const loadYaml = (path: string) => {
		if (!existsSync(path)) {
			return {};
		}
		const fileContent = readFileSync(path, "utf8");
		return (yaml.load(fileContent) ?? {}) as Record<string, unknown>;
	};

	try {
		const defaultConfig = loadYaml(join(configDir, "config.yml"));
		const envConfig = loadYaml(join(configDir, `config.${env}.yml`));
		return merge(defaultConfig, envConfig);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : typeof error === "string" ? error : "未知错误";
		throw new Error(`配置加载失败: ${message}`);
	}
};
