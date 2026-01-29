"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const yaml = require("js-yaml");
const lodash_1 = require("lodash");
exports.default = () => {
    const env = process.env.NODE_ENV || "development";
    const configDir = __dirname;
    const loadYaml = (path) => {
        if (!(0, fs_1.existsSync)(path)) {
            return {};
        }
        const fileContent = (0, fs_1.readFileSync)(path, "utf8");
        return (yaml.load(fileContent) ?? {});
    };
    try {
        const defaultConfig = loadYaml((0, path_1.join)(configDir, "config.yml"));
        const envConfig = loadYaml((0, path_1.join)(configDir, `config.${env}.yml`));
        return (0, lodash_1.merge)(defaultConfig, envConfig);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : typeof error === "string" ? error : "未知错误";
        throw new Error(`配置加载失败: ${message}`);
    }
};
