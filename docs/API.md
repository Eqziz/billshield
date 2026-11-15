# API v1

Base: `/api/v1`. JSON success: `{ "data": ..., "requestId": "uuid" }`. Errors: `{ "error": { "code": "...", "message": "...", "requestId": "uuid" } }`. All private responses disable caching. Never place tokens in URLs.

`POST /demo/session` issues/reuses a server-generated HttpOnly cookie. A new session has an isolated workspace and seven-day absolute expiration. `GET` inspects it; `DELETE` deletes the whole workspace and cookie. To start fresh, delete then POST. Mutations from browsers require `Origin` equal to `APP_ORIGIN`. Test/API clients must send that header and retain cookies. There is no cross-origin public API.

| Method           | Endpoint                     | Behavior                                                                                                             |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST/GET/DELETE  | `/demo/session`              | Create/reuse, inspect, or delete guest session and workspace.                                                        |
| POST             | `/uploads`                   | Multipart `file`, optional `serviceAccountId`; returns `{bill,manualRequired,aiEnhanced,ocrUsed,ocrPages,warnings}`. |
| GET/POST         | `/bills`                     | List workspace bills or create a draft from JSON.                                                                    |
| GET/PATCH/DELETE | `/bills/:id`                 | Read, replace editable fields or delete bill and cascaded analyses/actions/outcomes.                                 |
| POST             | `/bills/:id/confirm`         | Confirm reviewed values. Reject unknown totals/unacknowledged mismatches.                                            |
| POST             | `/bills/:id/analyze`         | Idempotently analyze the confirmed current revision.                                                                 |
| GET              | `/analyses/:id`              | Read owned analysis, bill, opportunities and action references.                                                      |
| POST             | `/opportunities/:id/actions` | Idempotently create/read template action. Reject stale analysis.                                                     |
| GET/PATCH        | `/actions/:id`               | Read script/context, update status/response/notes and recurring outcome.                                             |
| GET              | `/dashboard/summary`         | Database-backed metrics, bills, actions, accounts, trend and outcome history.                                        |
| DELETE           | `/privacy/workspace`         | Delete every workspace entity and clear session cookie.                                                              |
| GET              | `/health`                    | Check database connectivity; HTTP 200 only if available.                                                             |
| POST             | `/maintenance/cleanup`       | Bearer `CRON_SECRET`; remove expired guests and rate-limit rows.                                                     |

## Draft bill body

```json
{
  "providerName": "Example ISP",
  "displayName": "Home internet",
  "totalCents": 9000,
  "statementDate": "2026-11-01",
  "periodStart": "2026-11-01",
  "periodEnd": "2026-11-30",
  "dueDate": "2026-11-20",
  "discrepancyAcknowledged": false,
  "lineItems": [
    {
      "description": "Internet service",
      "category": "SERVICE",
      "amountCents": 7500,
      "recurrenceType": "MONTHLY",
      "confidence": 1,
      "evidence": "Entered by user"
    },
    {
      "description": "Equipment rental",
      "category": "EQUIPMENT",
      "amountCents": 1500,
      "recurrenceType": "MONTHLY",
      "confidence": 1,
      "evidence": "Entered by user"
    }
  ]
}
```

Dates are optional/null but if supplied must be real ISO calendar dates. Totals may be null while a draft, and must be nonnegative integer cents before confirmation. Line items support signed integer cents. Max absolute cents: 100,000,000. Up to 80 line items. Categories: SERVICE, EQUIPMENT, ADDON, DISCOUNT, TAX, ONE_TIME, OTHER. Frequency: MONTHLY, ONE_TIME, UNKNOWN. Optional `serviceAccountId` must belong to the guest and provider must match. PATCH replaces all editable fields and line items; callers should send a full validated bill. Omitting `serviceAccountId` on PATCH keeps the current account and updates its provider/label for that account.

## Action update

```json
{
  "status": "SUCCESSFUL",
  "providerResponse": "Provider confirmed removal of rental fee.",
  "userNotes": "Customer-owned compatible modem installed.",
  "outcome": {
    "previousMonthlyCents": 9000,
    "newMonthlyCents": 7500,
    "effectiveAt": "2026-11-01",
    "confirmed": true,
    "notes": "Recurring total, no credits."
  }
}
```

Statuses: PLANNED, PENDING, SUCCESSFUL, UNSUCCESSFUL. Only successful actions can have confirmed reductions. Outcome upserts one row per action. Omitting an outcome removes any existing savings row for that action; script/status/notes remain. One-time-fee actions cannot create recurring savings. GET returns action context and savings history entry.

Uploaded original bytes are discarded. Deleting a bill removes its document metadata and cascades its analyses/actions/outcomes. Full privacy deletion removes all metadata. No public document download endpoint exists.

Idempotency: session creation with a valid cookie reuses it; analysis is unique per revision; action is unique per opportunity; outcome is unique per action; repeated PDF hashes in one workspace return the existing bill. Parallel conflicting mutations can return 409. Manual draft creation is intentionally a new bill each time and clients must disable repeat submission. No payment operations exist.

Statuses: 400 malformed requests; 401 missing/expired session; 403 origin mismatch; 404 missing/foreign object; 409 concurrent change or stale analysis; 413 oversized file; 415 invalid MIME/signature/content type; 422 invalid fields/unreadable PDF/reconciliation issue; 429 rate/quota limit with Retry-After; 500 generic failure; 503 unsafe production rate-limit configuration. Malformed body errors are safe and contain no bill text.

## PDF image OCR

Uploads now render image-bearing pages and run bundled English OCR locally without a third-party OCR API. Text-only PDFs keep the native fast path. OCR is limited to five pages, three million rendered pixels per page and 90 seconds per document. The review page identifies OCR and partial recognition. One database-backed processing lease prevents concurrent OCR jobs from exhausting free-host memory; busy callers receive HTTP 429 PROCESSING_BUSY and can retry.

An untouched revision-one legacy draft is safely re-extracted when the same PDF is uploaded again. Edited or confirmed bills are never silently overwritten; delete the old bill and upload again if you explicitly want fresh extraction. Blank or unreadable content still requires manual entry.
