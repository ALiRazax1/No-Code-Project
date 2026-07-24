import { randomUUID } from "crypto";
import pinoHttp from "pino-http";
import { logger } from "../utils/logger";

/**
 * ---------------------------------------------------------------------------
 * Request logging
 * ---------------------------------------------------------------------------
 * Logs every request automatically — method, path, status code, response
 * time — as one structured line per request/response pair. This alone
 * answers "what's the error rate?" and "what's slow?" without any
 * additional instrumentation: filter by `res.statusCode >= 500` or sort by
 * `responseTime` in whatever's reading these logs.
 *
 * `req.log` (attached by this middleware to every request) is a pino child
 * logger already bound to that request's id — anything logged through it
 * elsewhere in the app (see authController.ts) is automatically
 * correlated back to the request that produced it, without having to pass
 * an id around manually.
 *
 * `genReqId` is deliberately a real UUID, not pino-http's own default (a
 * plain incrementing integer, reset every process restart). A UUID stays
 * globally unique across restarts and — relevant to the single-process
 * scaling question already tracked as a known gap — across multiple
 * instances too, if this ever runs as more than one process.
 * ---------------------------------------------------------------------------
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers["x-request-id"];
    const id = (Array.isArray(existingId) ? existingId[0] : existingId) ?? randomUUID();
    // Echoed back so a user-reported problem can be correlated to a
    // specific server-side log line — e.g. "attach the value of this
    // header to your support request."
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
