# Deployment

## Current state

Source, migrations, fixtures, container configuration, CI and pitch artifacts are prepared locally. GitHub authentication was found through Git Credential Manager and source was published at [https://github.com/Eqziz/billshield](https://github.com/Eqziz/billshield); anonymous HTTP access and matching remote source commits were verified. There is **no verified public production application URL**. Vercel and managed PostgreSQL are not configured. Sites hosting targets Cloudflare Workers and cannot run this Node child-process/Prisma application unchanged; a static landing-page deployment would not meet the product acceptance criteria.

## Recommended complete runtime: Node container + PostgreSQL

For a zero-cost, time-limited hackathon demo, use the [prepared Render Free Blueprint](RENDER.md). It creates the web service and database, generates secrets, configures the assigned origin and runs migrations at startup. The free database expires after 30 days. The generic production instructions below target durable infrastructure rather than this temporary free demo.

1. Provision a TLS PostgreSQL 16+ database and a Node/Docker hosting service (or your own server).
2. Set `DATABASE_URL`, `APP_ORIGIN=https://your-public-domain`, `RATE_LIMIT_SECRET` and `CRON_SECRET`. Keep secrets in the host's secret store. Configure `TRUST_PROXY=1` only behind a proxy that overwrites forwarding headers.
3. Run `npm ci`, then `npm run db:migrate` against the deployment database as a release step. Do not use `db push` in production.
4. Build the included Dockerfile, expose port 3000 behind HTTPS, and set a minimum container memory limit of 1 GB. Limit concurrency/scale according to resource measurements. The PDF process heap limit does not cap native allocations.
5. Set reverse-proxy body limit to 11 MB (multipart overhead); the app enforces 10 MB per PDF. Enforce request body limits at ingress before buffering. Set request timeout above 40 seconds and prevent unbounded concurrent uploads.
6. Schedule hourly `npm run cleanup`, or authenticated POST `/api/v1/maintenance/cleanup` with `Authorization: Bearer <CRON_SECRET>`. This route is excluded from browser Origin checks because bearer authentication is required.
7. Verify `/api/v1/health`, run the complete guest journey over HTTPS in fresh browser contexts, check session cookies, confirm refresh persistence, verify another guest gets 404, and exercise deletion.

For a local container demonstration: `docker compose up --build`. Compose uses `.env` secrets, a private PostgreSQL service and a persistent database volume. Apply migrations with `docker compose exec web npm run db:migrate` before using the app. Docker was not available in the implementation environment, so container execution remains unverified.

## Vercel + Neon / managed PostgreSQL

Connect the repository as a Next.js project and select Node 22. Use build command `npm run build`. Set all production environment variables and use the database provider's pooled connection string where recommended. Run `npm run db:migrate` as a separate release step against the correct database. Migrations need direct database access where required by the provider.

The Next config explicitly traces the standalone PDF subprocess and its runtime dependencies. Verify this on the deployed function; local production build is not proof of serverless packaging correctness. Set a function duration of at least 60 seconds if supported.

**Vercel's function request-body limit can be lower than 10 MB.** This release does not implement direct-to-private-object-storage uploads, so a Node container is the reliable option for the advertised maximum. If choosing Vercel, first implement a bounded private object-storage intake or change the advertised size and validation consistently to the platform's supported limit. Do not claim full 10 MB Vercel support without testing it.

Schedule cleanup externally via authenticated POST or a release-owned cron runner. No unauthenticated cron route is provided. Optional Sentry and OpenAI require separate configuration and live verification.

## Public GitHub source

Published and verified: [https://github.com/Eqziz/billshield](https://github.com/Eqziz/billshield). The remote is configured as `origin`. Subsequent changes can be published with `git push origin main` using the existing Git Credential Manager authentication.

```text
git clone https://github.com/Eqziz/billshield.git
cd billshield
npm ci
```

`.env`, `.local`, dependencies and private runtime data are ignored. No credential was written to source files or included in the remote URL. Public source access does not deploy the running application.

## Release checks

- CI passes typecheck, lint, unit/PDF tests, SQL migrations, production build and Chromium journey/API tests.
- HTTPS deployment exercises real uploads and verifies subprocess execution.
- Production origin, proxy trust, request size/concurrency limits, database TLS, secrets and hourly cleanup are configured.
- Public repository and production URL are verified from a signed-out browser.
- Submit the ten-slide `docs/BillShield-pitch.pdf` with both verified URLs.
- Review [TEST_REPORT.md](TEST_REPORT.md) for unverified areas and remaining blockers.
