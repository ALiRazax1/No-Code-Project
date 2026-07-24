import pino from "pino";
import { config } from "../config";

/**
 * ---------------------------------------------------------------------------
 * The application logger
 * ---------------------------------------------------------------------------
 * One pino instance, imported wherever structured logging is needed outside
 * of a request context (startup messages, background work). Inside a
 * request, prefer `req.log` (attached by the requestLogger middleware) over
 * this — it's a child logger already carrying that request's correlation
 * id, so anything logged through it is traceable back to one specific
 * request without extra plumbing.
 *
 * Output shape is deliberately different in dev vs. production:
 *  - Development: pretty-printed, colorized, human-readable — via the
 *    `pino-pretty` transport (a dev-only dependency; never loaded in prod).
 *  - Production: plain single-line JSON to stdout. This is the format any
 *    log aggregator (your hosting platform's log viewer, or something like
 *    Better Stack/Datadog/CloudWatch later) expects to ingest — structured
 *    fields, not a formatted string meant for a human terminal.
 * ---------------------------------------------------------------------------
 */
export const logger = pino({
  level: config.logging.level,
  transport: config.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
});
