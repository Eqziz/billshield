# Deployment

## Current state

Source, migrations, fixtures, container configuration, CI and pitch artifacts are prepared locally. No Vercel, managed PostgreSQL or GitHub credentials were supplied. There is **no verified public production URL or repository URL**. Sites hosting targets Cloudflare Workers and cannot run this Node child-process/Prisma application unchanged; a static landing-page deployment would not meet the product acceptance criteria.

## Recommended complete runtime: Node container + PostgreSQL

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

## Publish GitHub source

Create an empty **public** repository in the intended GitHub account, then from this checkout:

```text
git init -b main
git add .
git commit -m "Build BillShield internet bill analysis application"
git remote add origin https://github.com/YOUR_ACCOUNT/billshield.git
git push -u origin main
```

Review tracked files first; `.env`, `.local`, dependencies and private runtime data are ignored. Verify the repository is readable in a signed-out browser. GitHub credentials and account selection are external prerequisites; no account or URL is invented here.

## Release checks

- CI passes typecheck, lint, unit/PDF tests, SQL migrations, production build and Chromium journey/API tests.
- HTTPS deployment exercises real uploads and verifies subprocess execution.
- Production origin, proxy trust, request size/concurrency limits, database TLS, secrets and hourly cleanup are configured.
- Public repository and production URL are verified from a signed-out browser.
- Submit the ten-slide `docs/BillShield-pitch.pdf` with both verified URLs.
- Review [TEST_REPORT.md](TEST_REPORT.md) for unverified areas and remaining blockers.
