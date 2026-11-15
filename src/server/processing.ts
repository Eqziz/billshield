import { randomInt } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./security";

// One PDF/OCR job at a time protects the small free hosting instance.
// Expiry recovers a lease after a killed process; owner matching prevents stale release.
export async function acquirePdfSlot() {
  const owner = randomInt(1, 2147483647);
  const expiresAt = new Date(Date.now() + 120000);
  const rows = await db.$queryRaw<{ key: string }[]>`
    INSERT INTO "RateLimit" ("key","count","expiresAt") VALUES ('pdf-processing',${owner},${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET "count"=EXCLUDED."count", "expiresAt"=EXCLUDED."expiresAt"
    WHERE "RateLimit"."expiresAt" < NOW() RETURNING "key"`;
  if (!rows.length)
    throw new ApiError(
      429,
      "PROCESSING_BUSY",
      "Another PDF is being processed. Please wait a little and try again.",
    );
  return async () => {
    await db.rateLimit.deleteMany({
      where: { key: "pdf-processing", count: owner },
    });
  };
}
