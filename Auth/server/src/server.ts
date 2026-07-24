import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";
import { initDatabase, closeDatabase } from "./db";

async function main() {
  // Must complete before the server accepts any requests — connecting to
  // Mongo (when configured) is asynchronous, and a request that lands
  // before the connection is ready would fail in a confusing way.
  await initDatabase();

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`🔐 MiniClerk server running on http://localhost:${config.port}`);
    logger.info(`   CORS allowed origin: ${config.clientOrigin}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async (err) => {
      if (err) {
        logger.error({ err }, "Error during HTTP server close");
      } else {
        logger.info("HTTP server closed.");
      }

      try {
        await closeDatabase();
        logger.info("Graceful shutdown completed successfully.");
        process.exit(0);
      } catch (dbErr) {
        logger.error({ err: dbErr }, "Error closing database connection");
        process.exit(1);
      }
    });

    // Forced shutdown fallback if closing takes too long (e.g. 10 seconds)
    setTimeout(() => {
      logger.error("Graceful shutdown timed out, force exiting.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "❌ MiniClerk failed to start");
  process.exit(1);
});
