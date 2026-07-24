import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { config } from "./config";
import { requestLogger } from "./middleware/requestLogger";
import authRoutes from "./routes/authRoutes";

export function createApp() {
  const app = express();

  // If you deploy behind a reverse proxy or load balancer (Nginx, Heroku,
  // a cloud provider's LB, etc), uncomment this and set it to the correct
  // number of trusted hops — otherwise express-rate-limit (see
  // middleware/rateLimiter.ts) will see the proxy's IP for every request
  // and rate-limit all your users as if they were one client.
  // app.set("trust proxy", 1);

  // Mounted first, deliberately — everything after this point (including
  // the CORS check and every route) runs with `req.log` already available,
  // and every request/response pair gets logged automatically regardless
  // of where in the pipeline it fails.
  app.use(requestLogger);

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: config.clientOrigin,
      // Required so the browser sends/receives the HttpOnly session cookie.
      credentials: true,
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "miniclerk-server" });
  });

  app.use("/api/auth", authRoutes);

  // Centralized fallback error handler. Logs at "error" with the full
  // stack via `req.log` (not the bare `logger`), so this line carries the
  // same request id as every other log line for the request that failed —
  // that correlation is the entire point of putting requestLogger first.
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      req.log.error({ err }, "Unhandled error");
      res.status(500).json({ error: "Internal server error." });
    }
  );

  return app;
}
