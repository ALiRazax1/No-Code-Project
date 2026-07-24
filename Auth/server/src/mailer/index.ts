import { config } from "../config";
import { logger } from "../utils/logger";
import { consoleMailer } from "./consoleMailer";
import { resendMailer } from "./resendMailer";
import type { Mailer } from "./types";

/**
 * ---------------------------------------------------------------------------
 * The mailer factory
 * ---------------------------------------------------------------------------
 * Same shape as the database factory (`db/index.ts`): one place decides
 * which implementation is active, based on `MAILER_PROVIDER`.
 * `authController.ts` only ever imports `mailer` from here, never a
 * specific implementation, so adding a third provider later (Postmark,
 * SES, whatever) means writing one new file satisfying `Mailer` and adding
 * one branch below — nothing in the controller changes.
 *
 * Unlike the database factory, `resendMailer` is imported statically
 * rather than dynamically. The db factory defers `mongoose` behind an
 * `await import(...)` because it's a heavy driver with its own connection
 * lifecycle that shouldn't run unless Mongo is actually configured; the
 * `resend` package is just a thin HTTP client with no connection step, so
 * there's no real cost to importing it unconditionally, and doing so
 * keeps this file synchronous — no changes needed in server.ts to await
 * anything here.
 * ---------------------------------------------------------------------------
 */
function createMailer(): Mailer {
  switch (config.mailer.provider) {
    case "resend": {
      if (!config.mailer.resendApiKey) {
        throw new Error(
          "MAILER_PROVIDER=resend requires RESEND_API_KEY to be set (see .env.example)."
        );
      }
      logger.info(`📧 MiniClerk sending real email via Resend, from ${config.mailer.fromAddress}`);
      return resendMailer;
    }

    case "console":
    default:
      logger.info(
        "🖥️  MiniClerk is using the console mailer — emails are logged, not sent. Set MAILER_PROVIDER=resend (and RESEND_API_KEY) to send real email."
      );
      return consoleMailer;
  }
}

export const mailer: Mailer = createMailer();
