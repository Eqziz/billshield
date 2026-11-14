# Free Render demo deployment

[Deploy BillShield to Render](https://render.com/deploy?repo=https://github.com/Eqziz/billshield)

The repository includes `render.yaml` with a **Free Node web service** and **Free PostgreSQL database**. No paid service, disk, cron or pre-deploy step is declared. Render creates database credentials and random 256-bit application secrets; they are never committed to GitHub. The database blocks public-network access and is linked internally to the web service.

## Deploy

1. Open the deployment link above and sign into Render using GitHub. Authorize the repository if requested.
2. Review the two resources: `billshield` and `billshield-db`, **both on Free plans**. If your workspace already has its allowed free database, use another workspace or connect an existing suitable database rather than selecting a paid plan.
3. Click the deployment control and wait for the web service and database. The build runs `npm ci --include=dev && npm run build`. Startup runs `npm run start:hosted`, applies committed SQL migrations, clears expired guests and binds the application to `0.0.0.0:$PORT`.
4. Open the exact HTTPS URL assigned by Render. Do not assume the service's final hostname from its display name. `APP_ORIGIN` defaults to the platform-provided `RENDER_EXTERNAL_URL`; for a custom domain, set `APP_ORIGIN` explicitly to that exact HTTPS origin.
5. Verify `/api/v1/health`, then use a fresh guest to upload a sample PDF, review, analyze, record an outcome, refresh and delete the workspace. A second browser must not see the first guest's records.

The repository does not contain a Render API key and an account has not been connected to the coding environment. The deployment link is a setup link, **not an already deployed application URL**. Account sign-in/authorization is the remaining external action.

## Free-plan limits

- The web service sleeps after 15 minutes without traffic; a cold start can take approximately a minute. Open the application before presenting to judges.
- **The free Render PostgreSQL database expires after 30 days.** Export or migrate data before expiration if you need to keep the application. This is a time-limited hackathon/demo setup, not a free permanent production database.
- Free compute has limited RAM and CPU. The launcher caps the Next.js JS heap at 192 MB; the separate PDF process also caps its JS heap at 192 MB. Native memory and concurrent uploads can exceed these heap limits. Hosted capacity/load is not verified until an actual deployment; keep demonstration traffic modest.
- Original PDFs are not retained, so the ephemeral filesystem is appropriate. Database state is external to the web process and survives service restarts during the database's lifetime.
- Cleanup runs at process startup and hourly while awake, plus on new guest sessions. Timers do not run while the service sleeps. Expired cookies lose access immediately; physical removal follows the next cleanup.
- AI is disabled unless separately configured, so this setup does not incur AI API charges.
- Proxy trust remains disabled by default; anonymous rate limits share a conservative bucket. Enable per-IP proxy trust only after confirming that the host overwrites forwarded IP headers.

For longer-term free data storage, a separate Neon Free database can replace Render's database; this requires a Neon account and its connection string. No external database or account is created by the code itself.

Official references: [Free plan](https://render.com/docs/free), [Blueprint specification](https://render.com/docs/blueprint-spec), [Render environment variables](https://render.com/docs/environment-variables), [deployment button](https://render.com/docs/deploy-to-render).
