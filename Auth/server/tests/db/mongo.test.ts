import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  connectMongo,
  mongoSessionRepository,
  mongoUserRepository,
  mongoVerificationTokenRepository,
} from "../../src/db/adapters/mongo";
import {
  testSessionRepositoryContract,
  testUserRepositoryContract,
  testVerificationTokenRepositoryContract,
} from "./contract";

/**
 * These tests run the exact same contract as memory.test.ts, but against a
 * real, temporary, in-process MongoDB instance via `mongodb-memory-server`.
 * That's the whole point: if this file and memory.test.ts both pass, the
 * two adapters are behaviorally interchangeable, not just superficially
 * similar.
 *
 * Heads up: `mongodb-memory-server` downloads an actual mongod binary the
 * first time it runs, which needs network access and can take a minute or
 * two — subsequent runs reuse the cached binary and start in a couple of
 * seconds. If you're offline or in a locked-down sandbox, this is the file
 * that will fail to even start. The memory adapter's tests are completely
 * unaffected, since they need no external binary at all — run
 * `npm run test:no-mongo` to skip this file specifically.
 *
 * `MONGOMS_LAUNCH_TIMEOUT` below raises the library's OWN internal timeout
 * for the mongod process to report itself ready — this is separate from,
 * and shorter than, Jest's `beforeAll` timeout, and is the actual cause of
 * "Instance failed to start within 10000ms" errors. This shows up
 * particularly often on Windows, where antivirus software scanning the
 * freshly-downloaded mongod.exe (or a slower disk unpacking it) can easily
 * take longer than the library's default 10-second allowance.
 */
process.env.MONGOMS_LAUNCH_TIMEOUT = "60000";

describe("MongoDB adapter (Mongoose)", () => {
  let mongod: MongoMemoryServer | undefined;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectMongo(mongod.getUri());
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    // If beforeAll itself failed (e.g. the launch-timeout issue above),
    // `mongod` was never assigned — guard against that so teardown doesn't
    // throw a second, unrelated error that masks the real one.
    if (mongod) {
      await mongod.stop();
    }
  });

  async function reset() {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  }

  testUserRepositoryContract("mongo", { getRepo: () => mongoUserRepository, reset });
  testSessionRepositoryContract("mongo", { getRepo: () => mongoSessionRepository, reset });
  testVerificationTokenRepositoryContract("mongo", {
    getRepo: () => mongoVerificationTokenRepository,
    reset,
  });
});
