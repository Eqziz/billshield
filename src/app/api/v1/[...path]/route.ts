import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { db } from "@/server/db";
import {
  ApiError,
  cleanup,
  cookieName,
  hash,
  notFound,
  rateLimit,
  sameOrigin,
  session,
  sessionCookie,
  startSession,
} from "@/server/security";
import {
  billInclude,
  confirmBill,
  createAction,
  createBill,
  getAnalysis,
  getBill,
  runAnalysis,
  updateBill,
} from "@/server/bills";
import { getAction, updateAction } from "@/server/actions";
import { dashboard } from "@/server/dashboard";
import {
  enhanceExtraction,
  extractText,
  processPdf,
  type PdfExtraction,
} from "@/server/extraction";
import { acquirePdfSlot } from "@/server/processing";
import { reportError } from "@/server/monitoring";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Context = { params: Promise<{ path: string[] }> };
async function json(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "JSON_REQUIRED", "Send application/json.");
  const text = await request.text();
  if (text.length > 100000)
    throw new ApiError(413, "BODY_TOO_LARGE", "This request is too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "The request contains invalid JSON.",
    );
  }
}
async function handler(request: NextRequest, context: Context) {
  const requestId = randomUUID();
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const method = request.method;
    const ok = (data: unknown, status = 200) =>
      NextResponse.json(
        { data, requestId },
        {
          status,
          headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
        },
      );
    if (route === "health" && method === "GET") {
      await db.$queryRaw`SELECT 1`;
      return ok({
        status: "ok",
        ocr: "english-scans-v2",
        revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "local",
        extraction: process.env.OPENAI_API_KEY
          ? "deterministic-with-optional-ai"
          : "deterministic",
      });
    }
    if (route === "maintenance/cleanup" && method === "POST") {
      if (
        !process.env.CRON_SECRET ||
        request.headers.get("authorization") !==
          `Bearer ${process.env.CRON_SECRET}`
      )
        throw new ApiError(401, "UNAUTHORIZED", "Unauthorized.");
      await cleanup();
      return ok({ cleaned: true });
    }
    if (method !== "GET") sameOrigin(request);
    await rateLimit(
      request,
      route === "demo/session" ? "sessions" : "api",
      route === "demo/session" ? 20 : 150,
    );
    if (route === "demo/session" && method === "POST") {
      const result = await startSession(request);
      const response = ok({
        id: result.workspace.id,
        expiresAt: result.workspace.expiresAt,
      });
      if (result.token) sessionCookie(response, result.token);
      return response;
    }
    const workspace = await session(request);
    if (route === "demo/session" && method === "GET")
      return ok({ id: workspace.id, expiresAt: workspace.expiresAt });
    if (
      (route === "demo/session" || route === "privacy/workspace") &&
      method === "DELETE"
    ) {
      await db.workspace.delete({ where: { id: workspace.id } });
      const response = ok({ deleted: true });
      response.cookies.set(cookieName, "", { maxAge: 0, path: "/" });
      return response;
    }
    if (route === "dashboard/summary" && method === "GET")
      return ok(await dashboard(workspace.id));
    if (route === "bills" && method === "GET")
      return ok(
        await db.bill.findMany({
          where: { serviceAccount: { workspaceId: workspace.id } },
          include: billInclude,
          orderBy: { createdAt: "desc" },
        }),
      );
    if (route === "bills" && method === "POST")
      return ok(await createBill(workspace.id, await json(request)), 201);
    if (route === "uploads" && method === "POST") {
      if (!request.headers.get("content-type")?.includes("multipart/form-data"))
        throw new ApiError(
          415,
          "MULTIPART_REQUIRED",
          "Upload a PDF using multipart/form-data.",
        );
      await rateLimit(request, `upload-${workspace.id}`, 6);
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 10 * 1024 * 1024 + 50000)
        throw new ApiError(
          413,
          "FILE_TOO_LARGE",
          "Choose a PDF smaller than 10 MB.",
        );
      const usage = await db.apiUsage.upsert({
        where: {
          workspaceId_key: { workspaceId: workspace.id, key: "uploads" },
        },
        create: { workspaceId: workspace.id, key: "uploads" },
        update: { count: { increment: 1 } },
      });
      if (usage.count > 60)
        throw new ApiError(
          429,
          "UPLOAD_QUOTA",
          "The guest upload limit has been reached. You can still enter bills manually.",
        );
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new ApiError(
          400,
          "INVALID_MULTIPART",
          "The upload could not be read. Choose the file again.",
        );
      }
      const file = form.get("file");
      if (!(file instanceof File))
        throw new ApiError(400, "FILE_REQUIRED", "Choose a PDF bill.");
      if (file.size > 10 * 1024 * 1024)
        throw new ApiError(
          413,
          "FILE_TOO_LARGE",
          "Choose a PDF smaller than 10 MB.",
        );
      if (
        file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf")
      )
        throw new ApiError(
          415,
          "PDF_REQUIRED",
          "Only PDF documents are supported.",
        );
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.subarray(0, 5).toString() !== "%PDF-")
        throw new ApiError(
          415,
          "INVALID_SIGNATURE",
          "This file does not contain a valid PDF signature.",
        );
      const digest = hash(bytes);
      const existing = await db.documentAsset.findUnique({
        where: {
          workspaceId_sha256: { workspaceId: workspace.id, sha256: digest },
        },
        include: { bill: { include: billInclude } },
      });
      const upgrade =
        existing?.bill &&
        existing.bill.status === "DRAFT" &&
        existing.bill.revision === 1 &&
        !existing.processingStatus.includes("-v2");
      if (existing?.bill && !upgrade)
        return ok({
          bill: existing.bill,
          manualRequired: existing.processingStatus.includes("manual-required"),
          aiEnhanced: existing.processingStatus.includes("ai-assisted-v1"),
        });
      if (existing && !existing.bill)
        await db.documentAsset.delete({ where: { id: existing.id } });
      let processed: PdfExtraction;
      const release = await acquirePdfSlot();
      try {
        processed = await processPdf(bytes);
      } catch {
        throw new ApiError(
          422,
          "UNREADABLE_PDF",
          "This PDF could not be processed within the resource limit. Try an unlocked PDF, split a long scan into smaller files, or enter the bill manually.",
        );
      } finally {
        await release();
      }
      const text = processed.text;
      let data = extractText(text);
      let enhanced = false;
      if (text.trim().length > 30 && process.env.OPENAI_API_KEY) {
        const ai = await db.apiUsage.upsert({
          where: { workspaceId_key: { workspaceId: workspace.id, key: "ai" } },
          create: { workspaceId: workspace.id, key: "ai" },
          update: { count: { increment: 1 } },
        });
        if (ai.count <= 5) {
          const result = await enhanceExtraction(text, data);
          data = result.data;
          enhanced = result.enhanced;
        }
      }
      const selected = form.get("serviceAccountId");
      if (typeof selected === "string" && selected)
        data.serviceAccountId = selected;
      if (processed.ocrUsed)
        data.lineItems = data.lineItems.map((l) => ({
          ...l,
          confidence: Math.min(
            l.confidence,
            0.7,
            (processed.ocrConfidence ?? 60) / 100,
          ),
        }));
      const manualRequired = text.trim().length < 30;
      const method = manualRequired
        ? "manual-required-v2"
        : processed.ocrUsed
          ? processed.warnings.length
            ? "ocr-partial-v2"
            : "ocr-v2"
          : processed.warnings.length
            ? "ocr-incomplete-v2"
            : "deterministic-v2";
      const mode = `${/\bSYNTHETIC FIXTURE\b/i.test(text) ? "synthetic-" : ""}${method}${enhanced ? "-ai-assisted-v1" : ""}`;
      const bill =
        upgrade && existing?.bill
          ? await updateBill(workspace.id, existing.bill.id, data, mode)
          : await createBill(workspace.id, data, {
              name: file.name,
              size: file.size,
              sha256: digest,
              mode,
            });
      return ok(
        {
          bill,
          manualRequired,
          aiEnhanced: enhanced,
          ocrUsed: processed.ocrUsed,
          ocrPages: processed.ocrPages,
          warnings: processed.warnings,
        },
        201,
      );
    }
    if (path[0] === "bills" && path[1]) {
      const id = path[1];
      if (path.length === 2 && method === "GET")
        return ok(await getBill(workspace.id, id));
      if (path.length === 2 && method === "PATCH")
        return ok(await updateBill(workspace.id, id, await json(request)));
      if (path.length === 2 && method === "DELETE") {
        const bill = await getBill(workspace.id, id);
        await db.$transaction(async (tx) => {
          await tx.bill.delete({ where: { id } });
          if (bill.documentAssetId)
            await tx.documentAsset.delete({
              where: { id: bill.documentAssetId },
            });
        });
        return ok({ deleted: true });
      }
      if (path[2] === "confirm" && method === "POST")
        return ok(await confirmBill(workspace.id, id));
      if (path[2] === "analyze" && method === "POST")
        return ok(await runAnalysis(workspace.id, id));
    }
    if (path[0] === "analyses" && path.length === 2 && method === "GET")
      return ok(await getAnalysis(workspace.id, path[1]));
    if (
      path[0] === "opportunities" &&
      path.length === 3 &&
      path[2] === "actions" &&
      method === "POST"
    )
      return ok(await createAction(workspace.id, path[1]), 201);
    if (path[0] === "actions" && path.length === 2 && method === "GET")
      return ok(await getAction(workspace.id, path[1]));
    if (path[0] === "actions" && path.length === 2 && method === "PATCH")
      return ok(await updateAction(workspace.id, path[1], await json(request)));
    notFound();
  } catch (error) {
    let status = 500,
      code = "INTERNAL_ERROR",
      message = "Something went wrong. Please try again.";
    if (error instanceof ApiError) {
      status = error.status;
      code = error.code;
      message = error.message;
    } else if (error instanceof ZodError) {
      status = 422;
      code = "VALIDATION_ERROR";
      message = error.issues
        .map((i) => `${i.path.join(".") || "Bill"}: ${i.message}`)
        .join(" ")
        .slice(0, 700);
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      status = 409;
      code = "CONFLICT";
      message = "This record was updated concurrently. Please retry.";
    } else await reportError(requestId);
    return NextResponse.json(
      { error: { code, message, requestId } },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
