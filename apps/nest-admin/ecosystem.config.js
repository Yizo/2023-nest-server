module.exports = {
  apps: [
    {
      name: 'nestAdmin',
      script: 'dist/src/main.js', // 修复路径，移除/src/
      // 通用环境变量
      env: {
        NODE_ENV: 'development',
      },
      // 生产环境特定变量
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
