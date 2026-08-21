import type { Config } from "jest";

const config: Config = {
  rootDir: "..",
  testEnvironment: "node",
  watchman: false,
  testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
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
  clearMocks: true,
  collectCoverageFrom: [
    "<rootDir>/src/common/**/*.ts",
    "<rootDir>/src/modules/**/*.service.ts",
    "!<rootDir>/src/**/*.dto.ts",
  ],
};

export default config;
