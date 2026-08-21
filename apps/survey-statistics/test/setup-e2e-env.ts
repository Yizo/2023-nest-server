import { join } from "node:path";

process.env.NODE_ENV = "test";
process.env.PROCESS_ROLE = "all";
process.env.SWAGGER_ENABLED = "false";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  ?? "postgresql://postgres:postgres@localhost:5432/survey_statistics_test";
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/15";
process.env.JWT_ACCESS_SECRET = "e2e-access-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "e2e-refresh-secret-with-at-least-32-characters";

// The application is compiled to CommonJS in production, where __dirname is
// native. Jest runs TypeScript as ESM so it can load MikroORM 7; provide the
// equivalent directory only inside the E2E process.
(globalThis as typeof globalThis & { __dirname: string }).__dirname = join(process.cwd(), "src/database");
