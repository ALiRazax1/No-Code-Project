import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { requireAuth, optionalAuth } from "../../src/middleware/authMiddleware";
import { signAccessToken } from "../../src/utils/tokens";
import type { User } from "../../src/types";

// ---------------------------------------------------------------------------
// Minimal test doubles for Express's req / res / next
// ---------------------------------------------------------------------------

/** Builds a minimal Request double with an optional Authorization header. */
function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    // req.log is used by requireAuth for the "invalid token" warn branch.
    // Stub it out so the middleware never crashes due to a missing pino child
    // logger (which is only attached by the pino-http middleware in the full
    // app pipeline — not present in unit tests constructing req by hand).
    log: { warn: jest.fn() },
  } as unknown as Request;
}

/** Builds a minimal Response double that captures status + json calls. */
function makeRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

const next: NextFunction = jest.fn();

// A real, valid user shape — signAccessToken only needs id + email.
const testUser: User = {
  id: "user-test-123",
  email: "middleware@example.com",
  passwordHash: "hash",
  name: "Middleware Test",
  avatar: "https://example.com/avatar.png",
  emailVerified: false,
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe("requireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 NO_SESSION when the Authorization header is absent", () => {
    const req = makeReq();
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe("NO_SESSION");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 NO_SESSION when the header is present but not a Bearer token", () => {
    const req = makeReq("Basic dXNlcjpwYXNz");
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe("NO_SESSION");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 NO_SESSION when the Bearer value is an empty string after trimming", () => {
    const req = makeReq("Bearer    ");
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe("NO_SESSION");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 SESSION_EXPIRED for an already-expired token", () => {
    const expired = jwt.sign(
      { sub: testUser.id, email: testUser.email, type: "access" },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: -10 } // already in the past
    );
    const req = makeReq(`Bearer ${expired}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe("SESSION_EXPIRED");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 INVALID_SESSION for a token signed with the wrong secret", () => {
    const badToken = jwt.sign(
      { sub: testUser.id, email: testUser.email, type: "access" },
      "some-completely-wrong-secret"
    );
    const req = makeReq(`Bearer ${badToken}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe("INVALID_SESSION");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 INVALID_SESSION for a token whose `type` claim is wrong", () => {
    // A correctly-signed token, but with type: "refresh" instead of "access" —
    // verifyAccessToken explicitly rejects this even if the signature is valid.
    const wrongType = jwt.sign(
      { sub: testUser.id, email: testUser.email, type: "refresh" },
      process.env.ACCESS_TOKEN_SECRET as string
    );
    const req = makeReq(`Bearer ${wrongType}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe("INVALID_SESSION");
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and populates req.auth for a valid access token", () => {
    const token = signAccessToken(testUser);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toMatchObject({
      sub: testUser.id,
      email: testUser.email,
      type: "access",
    });
    // Response must NOT have been sent.
    expect(res.statusCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------

describe("optionalAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls next() without setting req.auth when no Authorization header is present", () => {
    const req = makeReq();
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBeUndefined();
  });

  it("calls next() without setting req.auth for an invalid token (silently ignored)", () => {
    const req = makeReq("Bearer not-a-valid-token-at-all");
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBeUndefined();
  });

  it("calls next() without setting req.auth for an expired token (silently ignored)", () => {
    const expired = jwt.sign(
      { sub: testUser.id, email: testUser.email, type: "access" },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: -10 }
    );
    const req = makeReq(`Bearer ${expired}`);
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toBeUndefined();
  });

  it("calls next() AND populates req.auth for a valid access token", () => {
    const token = signAccessToken(testUser);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toMatchObject({
      sub: testUser.id,
      email: testUser.email,
      type: "access",
    });
  });
});