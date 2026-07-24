/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  clearMocks: true,
  
  // mongodb-memory-server downloads a real mongod binary the first time it
  // runs, and spinning it up can take a while — the default 5s Jest timeout
  // is too tight for that. This also comfortably covers slower CI machines.
  testTimeout: 20000,
  
  // FIX 1: Change the regex to target BOTH .ts and .js files so ts-jest can transpile uuid
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },

  // FIX 2: Explicitly tell Jest NOT to ignore uuid so it gets sent to ts-jest
  transformIgnorePatterns: [
    "node_modules/(?!uuid)"
  ],
};