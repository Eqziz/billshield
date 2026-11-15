import "dotenv/config";
import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../src/server/db";
import {
  cleanup,
  hash,
  session,
  startSession,
  rateLimit,
  sameOrigin,
} from "../src/server/security";
import {
  createBill,
  getBill,
  updateBill,
  confirmBill,
  runAnalysis,
  createAction,
} from "../src/server/bills";
import { getAction, updateAction } from "../src/server/actions";
import { billSchema } from "../src/lib/validation";
import { acquirePdfSlot } from "../src/server/processing";
const created: string[] = [];
afterAll(async () => {
  await db.workspace.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});
describe.sequential("PostgreSQL integration", () => {
  it("serializes PDF jobs and releases the processing slot", async () => {
    const release = await acquirePdfSlot();
    try {
      await expect(acquirePdfSlot()).rejects.toMatchObject({
        code: "PROCESSING_BUSY",
      });
    } finally {
      await release();
    }
    const next = await acquirePdfSlot();
    await next();
  });
  it("upgrades untouched legacy extraction without overwriting user edits", async () => {
    const w = await db.workspace.create({
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    created.push(w.id);
    const data = {
      providerName: "Synthetic ISP",
      totalCents: null,
      lineItems: [],
    };
    const original = await createBill(w.id, data, {
      name: "legacy-scan.pdf",
      size: 100,
      sha256: `test-${w.id}`,
      mode: "manual-required",
    });
    const input = {
      providerName: "Synthetic ISP",
      totalCents: 7500,
      lineItems: [
        {
          description: "Internet service",
          category: "SERVICE",
          amountCents: 7500,
          recurrenceType: "MONTHLY",
        },
      ],
    };
    const upgraded = await updateBill(w.id, original.id, input, "ocr-v2");
    expect(upgraded.extractionVersion).toBe("ocr-v2");
    expect(upgraded.totalCents).toBe(7500);
    expect(
      (
        await db.documentAsset.findUniqueOrThrow({
          where: { id: original.documentAssetId! },
        })
      ).processingStatus,
    ).toBe("ocr-v2");
    await expect(
      updateBill(w.id, original.id, { ...input, totalCents: 8000 }, "ocr-v2"),
    ).rejects.toMatchObject({ code: "BILL_ALREADY_EDITED" });
    expect((await getBill(w.id, original.id)).totalCents).toBe(7500);
  });
  it("rejects missing production protection configuration and invalid origins", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_SECRET", "");
    try {
      await expect(
        rateLimit(
          new NextRequest("http://localhost:3000"),
          "configuration-test",
        ),
      ).rejects.toMatchObject({ status: 503 });
    } finally {
      vi.unstubAllEnvs();
    }
    expect(() =>
      sameOrigin(
        new NextRequest("http://localhost:3000", {
          headers: { origin: "https://untrusted.example" },
        }),
      ),
    ).toThrow();
  });
  it("persists and enforces rate limits across requests", async () => {
    const bucket = `test-${Date.now()}`;
    const request = new NextRequest("http://localhost:3000");
    await rateLimit(request, bucket, 1);
    await expect(rateLimit(request, bucket, 1)).rejects.toMatchObject({
      status: 429,
    });
  });
  it("creates secure hashed sessions, reuses cookies and rejects expired sessions", async () => {
    const result = await startSession(new NextRequest("http://localhost:3000"));
    created.push(result.workspace.id);
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    const record = await db.guestSession.findFirstOrThrow({
      where: { workspaceId: result.workspace.id },
    });
    expect(record.tokenHash).toBe(hash(result.token!));
    expect(record.tokenHash).not.toBe(result.token);
    const request = new NextRequest("http://localhost:3000", {
      headers: { cookie: `billshield_guest=${result.token}` },
    });
    expect((await session(request)).id).toBe(result.workspace.id);
    expect((await startSession(request)).token).toBeNull();
    await db.guestSession.update({
      where: { id: record.id },
      data: { expiresAt: new Date(0) },
    });
    await expect(session(request)).rejects.toMatchObject({ status: 401 });
  });
  it("persists bills, prevents foreign access and invalidates stale analyses", async () => {
    const w = await db.workspace.create({
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    created.push(w.id);
    const input = billSchema.parse({
      providerName: "Synthetic Test ISP",
      totalCents: 9000,
      lineItems: [
        {
          description: "Internet service",
          category: "SERVICE",
          amountCents: 7500,
          recurrenceType: "MONTHLY",
        },
        {
          description: "Equipment rental",
          category: "EQUIPMENT",
          amountCents: 1500,
          recurrenceType: "MONTHLY",
        },
      ],
    });
    const bill = await createBill(w.id, input);
    expect((await getBill(w.id, bill.id)).lineItems).toHaveLength(2);
    await expect(getBill("foreign-workspace", bill.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      updateBill("foreign-workspace", bill.id, input),
    ).rejects.toMatchObject({ status: 404 });
    await confirmBill(w.id, bill.id);
    const analysis = await runAnalysis(w.id, bill.id);
    expect((await runAnalysis(w.id, bill.id)).id).toBe(analysis.id);
    const op = analysis.opportunities.find(
      (o) => o.type === "EQUIPMENT_RENTAL",
    )!;
    const action = await createAction(w.id, op.id);
    await updateAction(w.id, action.id, {
      status: "SUCCESSFUL",
      outcome: {
        previousMonthlyCents: 9000,
        newMonthlyCents: 7500,
        effectiveAt: "2026-01-01",
        confirmed: true,
      },
    });
    expect((await getAction(w.id, action.id)).savings[0].newMonthlyCents).toBe(
      7500,
    );
    await updateBill(w.id, bill.id, input);
    expect(
      (await db.analysis.findUniqueOrThrow({ where: { id: analysis.id } }))
        .status,
    ).toBe("STALE");
    await expect(createAction(w.id, op.id)).rejects.toMatchObject({
      status: 409,
    });
    await db.workspace.delete({ where: { id: w.id } });
    expect(await db.bill.count({ where: { id: bill.id } })).toBe(0);
    expect(await db.actionPlan.count({ where: { id: action.id } })).toBe(0);
    expect(
      await db.savingsEvent.count({ where: { actionPlanId: action.id } }),
    ).toBe(0);
  });
  it("requires a known total and explicit reconciliation acknowledgement", async () => {
    const w = await db.workspace.create({
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    created.push(w.id);
    const missing = await createBill(w.id, {
      providerName: "Synthetic",
      totalCents: null,
      lineItems: [],
    });
    await expect(confirmBill(w.id, missing.id)).rejects.toMatchObject({
      code: "TOTAL_REQUIRED",
    });
    const mismatch = await createBill(w.id, {
      providerName: "Synthetic",
      totalCents: 1500,
      lineItems: [],
    });
    await expect(confirmBill(w.id, mismatch.id)).rejects.toMatchObject({
      code: "TOTAL_MISMATCH",
    });
  });
  it("physically removes expired workspaces on cleanup", async () => {
    const w = await db.workspace.create({ data: { expiresAt: new Date(0) } });
    await cleanup();
    expect(await db.workspace.findUnique({ where: { id: w.id } })).toBeNull();
  });
});
