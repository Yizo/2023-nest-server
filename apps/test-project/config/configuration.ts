import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { merge } from 'lodash';

export default () => {
  const configDir = join(__dirname, '../../config');
  const env = process.env.NODE_ENV || 'development';
  console.log(`当前环境: ${env}`);

  try {
    // 加载默认配置
    const defaultConfig = yaml.load(
      readFileSync(join(configDir, 'config.yml'), 'utf8'),
    ) as Record<string, any>;
    // 加载环境配置（允许不存在）
    let envConfig = {};
    const envConfigPath = join(configDir, `config.${env}.yml`);
    if (readFileSync(envConfigPath, 'utf8')) {
      envConfig = yaml.load(readFileSync(envConfigPath, 'utf8')) || {};
    }
    // 深合并配置
    const mergedConfig = merge(defaultConfig, envConfig);
    console.log('合并后的配置:', mergedConfig);
    return mergedConfig;
  } catch (error) {
    throw new Error(`配置加载失败: ${error.message}`);
  }
};
