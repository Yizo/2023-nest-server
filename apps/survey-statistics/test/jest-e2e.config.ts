import type { Config } from "jest";

const config: Config = {
  rootDir: "..",
  testEnvironment: "node",
  watchman: false,
  testMatch: ["<rootDir>/test/e2e/**/*.e2e-spec.ts"],
  setupFiles: ["<rootDir>/test/setup-e2e-env.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: "<rootDir>/test/tsconfig.json",
      useESM: true,
    }],
  },
  testTimeout: 60_000,
  maxWorkers: 1,
};

export default config;
