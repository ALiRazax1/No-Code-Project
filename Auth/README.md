# Auth

A production-considered, self-hosted authentication and identity engine — sign-up, sign-in, session management, email verification, and password reset — built with a Node/Express + TypeScript backend and a React + Vite frontend. Built entirely through prompt-based, AI-assisted development, the project demonstrates how a fully functional, security-conscious auth system can be created without manually writing the application's code.

## Installation

The project is split into two parts — a backend (`server/`) and a frontend (`client/`) — each with its own dependencies and its own dev server.

### 1. Backend setup

1. Navigate to the server directory:

   ```text
   cd Auth/server
   ```

2. Install dependencies:

   ```text
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in the values (the file itself explains what each one does). The defaults work out of the box for local development, with no real database or email provider required — sessions are kept in memory and "sent" emails are just logged to the terminal:

   ```text
   cp .env.example .env
   ```

4. Start the dev server:

   ```text
   npm run dev
   ```

   The API will be running at `http://localhost:4000` (or whatever `PORT` you set in `.env`).

### 2. Frontend setup

1. Navigate to the client directory:

   ```text
   cd Auth/client
   ```

2. Install dependencies:

   ```text
   npm install
   ```

3. Start the dev server:

   ```text
   npm run dev
   ```

   The app will be running at `http://localhost:5173` (Vite's default).

### Connecting the frontend to the backend locally

By default, `client/src/api/authApi.ts` builds its base URL from `VITE_API_BASE_URL`, meant for deployment — where the frontend and backend share a domain and requests are routed through `/api`. For local development, where the frontend and backend run on different ports, open that file and switch which line is active:

```ts
// Comment this out for local development:
const DEFAULT_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

// Uncomment this instead:
// const DEFAULT_BASE_URL = "http://localhost:4000/api";
```

**Before deploying, make sure to switch this back** — use `VITE_API_BASE_URL` (set to `/api` in your production environment) so requests route correctly on the live domain instead of pointing at `localhost`.

## Features

* Full sign-up / sign-in / sign-out flow with short-lived JWT access tokens and rotating refresh tokens
* Refresh-token reuse detection — automatically revokes every session for a user if a stolen or replayed token is detected
* "Sign out of all devices," with a two-click confirmation in the UI
* Email verification and password reset, with pluggable email delivery (console logging in development, Resend in production)
* CSRF protection on state-changing requests, deliberately scoped to avoid a sign-in deadlock on token refresh
* Pluggable storage layer — in-memory (zero setup, resets on restart) or MongoDB, behind a shared repository interface so both behave identically
* Designed to support new databases without touching application code — adding Postgres, Supabase, or any other backend is just a matter of writing one new adapter that satisfies the existing repository interfaces; nothing in the controllers or middleware needs to change
* Automatic MongoDB TTL cleanup for expired sessions and verification tokens
* Production-only secrets enforcement — refuses to start if secrets are missing, left as placeholders, too short, or identical to each other
* Structured JSON logging (pino), with explicit security-event logs for failed sign-ins, session reuse, and CSRF rejections
* Configurable rate limiting on sign-in, sign-up, and password-reset requests
* Input sanitization with real, enforced bounds on name, email, and password length
* Graceful shutdown — cleans up the HTTP server and database connection on process exit
* Dark glassmorphism UI, with per-client branding isolated to a single config file and a shared brand component
* Full test suite (Jest + Supertest + an in-memory MongoDB instance) and a GitHub Actions CI pipeline

## How It Works

The backend follows a repository pattern: all authentication logic is written against a shared storage interface, with two interchangeable adapters behind it — an in-memory store for local development and testing, and a MongoDB adapter for production — selected with the `DB_PROVIDER` environment variable. `server/src/db/index.ts` is the single file that decides which adapter is active; everything else (controllers, middleware) only ever talks to the shared interface and has no idea whether it's reading from plain in-memory arrays or a real MongoDB cluster. This means adding support for a different database entirely — Postgres, Supabase, or anything else — is just a matter of writing one new adapter that satisfies the existing repository interfaces and adding a branch to `initDatabase()`; nothing in the application logic itself needs to change. The same pluggable pattern is used for email delivery, so the app can log "sent" emails to the console during development and switch to a real provider with a single environment variable change in production.

Authentication uses a standard short-lived access token (15 minutes, held in memory on the client) paired with a longer-lived refresh token (7 days, stored in an HttpOnly cookie), rotated on every use. If a refresh token is ever reused after rotation — a strong signal of token theft — every session belonging to that user is revoked immediately.

The project is designed around a **hybrid deployment model**: one hardened codebase, with a separate, isolated instance — its own database, secrets, and domain — per client, rather than a single shared multi-tenant deployment. Per-client branding is isolated to one config file and one shared component, so reskinning a new client's instance touches almost nothing else in the codebase.

## Current Limitations

* Rate limiting is in-memory, so it won't hold a shared limit across multiple instances or processes of the same deployment — fine for one process per client, a gap if that ever changes.
* Not multi-tenant by design — each client requires its own isolated deployment rather than sharing a single instance.
* No social login, multi-factor authentication, role-based access control, or admin dashboard yet.
* The MongoDB adapter has been verified for correctness against the in-memory adapter and confirmed working against a real MongoDB Atlas connection, but not yet exercised under real concurrent/production load.
* No built-in cross-domain single sign-on or account synchronization across separate client deployments.

## Future Ideas

* Shared/distributed rate limiting (e.g. Redis-backed) to support multi-instance deployments.
* Multi-factor authentication and social login providers.
* Role-based access control and an admin dashboard for managing users and sessions.
* Audit logging for account and session activity.
* Optional multi-tenancy support for shared deployments.
* Security headers middleware (CSP, HSTS, etc.) and integrated error monitoring/alerting.
* Cross-domain SSO and API/product versioning for centrally managing multiple client deployments.

## License

This project is licensed under the [MIT License](LICENSE) — in short, anyone is free to use, copy, modify, and distribute this code, including commercially, as long as the original copyright notice is kept, and without warranty of any kind.

## Acknowledgements

This project was built entirely through prompt-based, AI-assisted development, using **Claude (Anthropic)** and **Google Antigravity** — architecture decisions, security design (CSRF handling, refresh-token rotation and reuse detection, secrets enforcement), bug fixes, and testing were all driven through conversation with these AI coding assistants rather than by hand-writing the implementation. It explores how far prompt-driven development can go toward a genuinely production-considered authentication system, including diagnosing real, non-trivial issues along the way — a sign-in/CSRF deadlock, a frontend race condition, and a TypeScript module-resolution bug that broke the production build without ever showing up in the test suite.
