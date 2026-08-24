process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/admin_api_test";
process.env.REDIS_URL ??= "redis://127.0.0.1:1/15";
