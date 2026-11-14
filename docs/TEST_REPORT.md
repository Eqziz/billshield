# Verification report

Executed locally on Windows, **2026-11-14**, with Node **22.23.5**, Next.js **16.4.6**, Prisma **6.19.3** and real embedded PostgreSQL **18.6**. No claim of cloud deployment or CI execution is made.

## Results

| Check                               | Result                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm install` / lockfile generation | Successful; committed lockfile supports `npm ci`.                                        |
| `prisma migrate deploy`             | Both SQL migrations successfully applied to local PostgreSQL.                            |
| `npm run typecheck`                 | Passed.                                                                                  |
| `npm run lint`                      | Passed, zero errors/warnings.                                                            |
| `npm test`                          | **38 passed** across two files, no failures or worker errors.                            |
| `npm run build`                     | Successful production compilation, type validation and route generation.                 |
| `npm run test:e2e`                  | **3 passed**, production Next server and Chromium.                                       |
| `npm audit`                         | **Zero vulnerabilities** after documented dependency overrides.                          |
| `npm run pitch`                     | Generated a **10-page** PDF.                                                             |
| `node scripts/capture.mjs`          | Five screenshots; no page errors; checked five routes at 390 px for horizontal overflow. |

## Coverage

Unit/PDF coverage: exact money conversion and invalid values; date normalization and invalid/reversed periods; missing totals; rental and add-on rules; existing promotional discounts; equipment purchases and unknown recurrence; one-time fees; recurring bill differences; opportunity overlap/caps; confirmed outcomes without double counting; future/unconfirmed outcome exclusion; personalized scripts; AI evidence amount grounding; absent AI, provider outage and ungrounded structured-output fallback; parsing all three actual generated PDFs.

PostgreSQL integration: secure random tokens and hash-only persistence; cookie/session reuse; expiration rejection; owned bill CRUD; cross-workspace reads/edits rejected; confirmed reconciliation; analysis revision idempotency; action/outcome persistence; stale-analysis rejection; cascading data deletion; expired guest cleanup; missing secure production configuration; invalid origins; persistent rate limiting.

Browser scenario 1: landing → demo → private guest → real file-picker PDF upload → extracted values → edit a charge → explicit mismatch acknowledgement → confirmation and analysis → personalized equipment script → successful confirmed recurring outcome → dashboard → refresh persistence → a second browser receives foreign-record rejection → delete both guests → fresh empty state.

Browser scenario 2: mobile dashboard empty state and no overflow; invalid-signature upload; oversized-file rejection.

HTTP scenario: guest isolation, PDF upload, repeated-file idempotency, bill analysis idempotency, foreign action access rejection, stale analysis invalidation, second-bill comparison on the same account, CSRF rejection, malformed PDF rejection, textless-PDF manual fallback, deletion and reupload of the same document, workspace deletion and session revocation.

Fixtures are synthetic and clearly marked in the documents and application. Production parsing does not return hardcoded data based on their filenames.

## Issues found and resolved

- Node 26/worker-thread native PDF shutdown instability: switched to a bounded child process; all PDF tests pass on the documented Node 22 runtime.
- Turbopack static transformation of `fork`: switched to an explicit Node subprocess and tracing includes; production build and production uploads pass.
- Unknown totals initially defaulted to zero: now nullable, blank on review and rejected before confirmation.
- Duplicate document metadata after bill deletion: transactional metadata deletion and regression coverage permit reupload.
- Next route-announcer conflicted with generic alert selectors: scoped browser assertions to application errors.
- API test sent JSON Content-Type with multipart data: corrected the test and hardened malformed upload errors.
- Development dependency advisories: patched transitive merge/glob dependencies via tested overrides; final audit clean.
- Supporting typography/contrast and sample labeling: improved and included in the final product build.

## Unverified areas and release blockers

- No verified public URL or public GitHub repository. GitHub and Vercel integrations require installation/connection; no remote source was pushed.
- No production managed PostgreSQL, HTTPS/proxy configuration, request concurrency/body-size limits or scheduled cleanup has been provisioned.
- Docker and Linux CI configurations are provided but were not executed locally. Only Windows/Node 22 and Chromium were executed.
- Serverless subprocess dependency tracing needs a real hosted smoke test. Vercel ingress may reject documents below the app's 10 MB maximum; use a Node container or implement private-storage intake before promising the full limit there.
- Live AI output quality and Sentry delivery are unverified. Their failure paths are tested/sanitized; neither integration is advertised as live in the default configuration.
- No scanned-PDF OCR, provider account validation, actual provider offers, payment processing or authenticated long-term accounts.
- Extraction was tested against synthetic text-based PDFs, not an external corpus of real provider layouts. Review/correction remains required.
- Confirmed savings are user-attested; annualized projections assume twelve unchanged months. One-time refunds are notes, not recurring savings.
- Safari/Firefox, assistive-technology audits, sustained load, hostile PDF fuzzing and independent security review were not performed.
- Add actual team names to the final pitch before submission; none were supplied.
