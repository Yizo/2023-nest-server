module.exports = {
  rootDir: "..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
  moduleFileExtensions: ["js", "json", "ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }]
  },
  setupFiles: ["<rootDir>/test/jest.setup.cjs"],
  watchman: false,
  clearMocks: true,
  restoreMocks: true
};
