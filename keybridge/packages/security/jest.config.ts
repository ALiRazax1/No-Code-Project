import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    // Map src imports so tests can import from src directly
    "^@keybridge/security$": "<rootDir>/src/index.ts",
    "^@keybridge/security/(.*)$": "<rootDir>/src/$1",
    // ts-jest runs .ts files directly; strip the .js extension from ESM-style imports
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.ts"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  // Ensure tests run serially — important for tests that spy on console/logs
  testRunner: "jest-circus/runner",
};

export default config;