module.exports = {
  rootDir: "..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/e2e/**/*.e2e-spec.ts"],
  moduleFileExtensions: ["js", "json", "ts"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/test/tsconfig.json", useESM: true }]
  },
  setupFiles: ["<rootDir>/test/jest.setup.cjs"],
  watchman: false,
  clearMocks: true,
  restoreMocks: true
};
