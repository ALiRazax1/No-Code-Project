import {
  memorySessionRepository,
  memoryUserRepository,
  memoryVerificationTokenRepository,
  __resetMemoryStoreForTests,
} from "../../src/db/adapters/memory";
import {
  testSessionRepositoryContract,
  testUserRepositoryContract,
  testVerificationTokenRepositoryContract,
} from "./contract";

describe("In-memory adapter", () => {
  testUserRepositoryContract("memory", {
    getRepo: () => memoryUserRepository,
    reset: __resetMemoryStoreForTests,
  });

  testSessionRepositoryContract("memory", {
    getRepo: () => memorySessionRepository,
    reset: __resetMemoryStoreForTests,
  });

  testVerificationTokenRepositoryContract("memory", {
    getRepo: () => memoryVerificationTokenRepository,
    reset: __resetMemoryStoreForTests,
  });
});
