import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError, notFound } from "./security";
import { billSchema, type BillInput } from "@/lib/validation";
import { analyze, negotiationScript } from "@/lib/domain";
export const billInclude = {
  serviceAccount: true,
  lineItems: true,
  analyses: {
    orderBy: { createdAt: "desc" as const },
    include: { opportunities: { include: { actions: true } } },
  },
  documentAsset: { select: { originalFilename: true, processingStatus: true } },
} satisfies Prisma.BillInclude;
export async function getBill(workspaceId: string, id: string) {
  return (
    (await db.bill.findFirst({
      where: { id, serviceAccount: { workspaceId } },
      include: billInclude,
    })) ?? notFound()
  );
}
function billFields(data: BillInput) {
  return {
    totalCents: data.totalCents,
    periodStart: data.periodStart ? new Date(data.periodStart) : null,
    periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
    statementDate: data.statementDate ? new Date(data.statementDate) : null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    discrepancyAcknowledged: data.discrepancyAcknowledged,
  };
}
export async function createBill(
  workspaceId: string,
  raw: unknown,
  document?: { name: string; size: number; sha256: string; mode: string },
) {
  const data = billSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      if (
        (await tx.bill.count({ where: { serviceAccount: { workspaceId } } })) >=
        30
      )
        throw new ApiError(
          429,
          "WORKSPACE_LIMIT",
          "This guest workspace supports up to 30 bills. Delete older bills to continue.",
        );
      const account = data.serviceAccountId
        ? await tx.serviceAccount.findFirst({
            where: { id: data.serviceAccountId, workspaceId },
          })
        : await tx.serviceAccount.create({
            data: {
              workspaceId,
              providerName: data.providerName,
              displayName: data.displayName,
            },
          });
      if (!account) notFound();
      if (
        data.serviceAccountId &&
        account.providerName.toLowerCase() !== data.providerName.toLowerCase()
      )
        throw new ApiError(
          422,
          "PROVIDER_MISMATCH",
          "Choose an account with the same provider or create a separate account.",
        );
      const asset = document
        ? await tx.documentAsset.create({
            data: {
              workspaceId,
              originalFilename: document.name.slice(0, 200),
              contentType: "application/pdf",
              sizeBytes: document.size,
              sha256: document.sha256,
              processingStatus: document.mode,
              expiresAt: new Date(),
              deletedAt: new Date(),
            },
          })
        : null;
      const bill = await tx.bill.create({
        data: {
          ...billFields(data),
          serviceAccountId: account.id,
          documentAssetId: asset?.id,
          extractionVersion: document?.mode || "manual-v1",
          lineItems: { create: data.lineItems },
        },
        include: billInclude,
      });
      await tx.auditEvent.create({
        data: { workspaceId, event: "BILL_CREATED" },
      });
      return bill;
    },
    { isolationLevel: "Serializable" },
  );
}
export async function updateBill(
  workspaceId: string,
  id: string,
  raw: unknown,
  extractionMode?: string,
) {
  const data = billSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { id, serviceAccount: { workspaceId } },
        include: {
          analyses: {
            include: {
              opportunities: {
                include: { actions: { include: { savings: true } } },
              },
            },
          },
        },
      });
      if (!bill) notFound();
      if (extractionMode && (bill.status !== "DRAFT" || bill.revision !== 1))
        throw new ApiError(
          409,
          "BILL_ALREADY_EDITED",
          "This bill was edited while it was being rescanned. Your changes were preserved.",
        );
      const account = data.serviceAccountId
        ? await tx.serviceAccount.findFirst({
            where: { id: data.serviceAccountId, workspaceId },
          })
        : null;
      if (data.serviceAccountId && !account) notFound();
      if (
        account &&
        account.providerName.toLowerCase() !== data.providerName.toLowerCase()
      )
        throw new ApiError(
          422,
          "PROVIDER_MISMATCH",
          "The provider must match the selected account.",
        );
      // Account identity changes affect every bill in that account and must be explicit.
      if (!account)
        await tx.serviceAccount.update({
          where: { id: bill.serviceAccountId },
          data: {
            providerName: data.providerName,
            displayName: data.displayName,
          },
        });
      await tx.analysis.updateMany({
        where: { billId: id },
        data: { status: "STALE" },
      });
      await tx.billLineItem.deleteMany({ where: { billId: id } });
      if (extractionMode && bill.documentAssetId)
        await tx.documentAsset.update({
          where: { id: bill.documentAssetId },
          data: { processingStatus: extractionMode },
        });
      return tx.bill.update({
        where: { id },
        data: {
          ...billFields(data),
          ...(extractionMode ? { extractionVersion: extractionMode } : {}),
          ...(account ? { serviceAccountId: account.id } : {}),
          revision: { increment: 1 },
          status: "DRAFT",
          lineItems: { create: data.lineItems },
        },
        include: billInclude,
      });
    },
    { isolationLevel: "Serializable" },
  );
}
export async function confirmBill(workspaceId: string, id: string) {
  return db.$transaction(
    async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { id, serviceAccount: { workspaceId } },
        include: { lineItems: true },
      });
      if (!bill) notFound();
      if (bill.totalCents === null)
        throw new ApiError(
          422,
          "TOTAL_REQUIRED",
          "Enter the statement total before confirming this bill.",
        );
      if (
        bill.lineItems.reduce((s, l) => s + l.amountCents, 0) !==
          bill.totalCents &&
        !bill.discrepancyAcknowledged
      )
        throw new ApiError(
          422,
          "TOTAL_MISMATCH",
          "Line items do not equal the statement total. Correct them or explicitly acknowledge the discrepancy.",
        );
      return tx.bill.update({ where: { id }, data: { status: "CONFIRMED" } });
    },
    { isolationLevel: "Serializable" },
  );
}
export async function runAnalysis(workspaceId: string, id: string) {
  return db.$transaction(
    async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { id, serviceAccount: { workspaceId } },
        include: { lineItems: true, analyses: true },
      });
      if (!bill) notFound();
      if (bill.status !== "CONFIRMED" || bill.totalCents === null)
        throw new ApiError(
          422,
          "REVIEW_REQUIRED",
          "Review and confirm this bill before analyzing it.",
        );
      const existing = bill.analyses.find(
        (a) => a.sourceVersion === bill.revision && a.status === "COMPLETE",
      );
      if (existing)
        return tx.analysis.findUniqueOrThrow({
          where: { id: existing.id },
          include: {
            bill: { include: { serviceAccount: true, lineItems: true } },
            opportunities: { include: { actions: true } },
          },
        });
      const chronological = bill.statementDate || bill.periodStart;
      const previous = chronological
        ? await tx.bill.findFirst({
            where: {
              serviceAccountId: bill.serviceAccountId,
              id: { not: id },
              status: "CONFIRMED",
              OR: [
                { statementDate: { lt: chronological } },
                { statementDate: null, periodStart: { lt: chronological } },
              ],
            },
            orderBy: [
              { statementDate: { sort: "desc", nulls: "last" } },
              { periodStart: "desc" },
            ],
            include: { lineItems: true },
          })
        : null;
      const toDomain = (b: typeof bill) => ({
        totalCents: b.totalCents ?? 0,
        lineItems: b.lineItems.map((l) => ({
          ...l,
          category: l.category as BillInput["lineItems"][number]["category"],
          recurrenceType:
            l.recurrenceType as BillInput["lineItems"][number]["recurrenceType"],
        })),
      });
      const findings = analyze(
        toDomain(bill),
        previous
          ? {
              totalCents: previous.totalCents ?? 0,
              lineItems: previous.lineItems.map((l) => ({
                ...l,
                category:
                  l.category as BillInput["lineItems"][number]["category"],
                recurrenceType:
                  l.recurrenceType as BillInput["lineItems"][number]["recurrenceType"],
              })),
            }
          : undefined,
      );
      return tx.analysis.create({
        data: {
          billId: id,
          sourceVersion: bill.revision,
          opportunities: { create: findings },
        },
        include: {
          bill: { include: { serviceAccount: true, lineItems: true } },
          opportunities: { include: { actions: true } },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
export async function getAnalysis(workspaceId: string, id: string) {
  return (
    (await db.analysis.findFirst({
      where: { id, bill: { serviceAccount: { workspaceId } } },
      include: {
        bill: { include: { serviceAccount: true, lineItems: true } },
        opportunities: { include: { actions: true } },
      },
    })) ?? notFound()
  );
}
export async function createAction(workspaceId: string, id: string) {
  return db.$transaction(
    async (tx) => {
      const op = await tx.opportunity.findFirst({
        where: { id, analysis: { bill: { serviceAccount: { workspaceId } } } },
        include: {
          analysis: {
            include: { bill: { include: { serviceAccount: true } } },
          },
        },
      });
      if (!op) notFound();
      if (
        op.analysis.status !== "COMPLETE" ||
        op.analysis.sourceVersion !== op.analysis.bill.revision
      )
        throw new ApiError(
          409,
          "STALE_ANALYSIS",
          "This analysis is out of date. Confirm and analyze the updated bill first.",
        );
      const evidence = Array.isArray(op.evidenceJson)
        ? op.evidenceJson.filter((e): e is string => typeof e === "string")
        : [];
      return tx.actionPlan.upsert({
        where: { opportunityId: id },
        create: {
          opportunityId: id,
          script: negotiationScript(
            op.analysis.bill.serviceAccount.providerName,
            op.analysis.bill.totalCents ?? 0,
            op,
            evidence,
          ),
        },
        update: {},
      });
    },
    { isolationLevel: "Serializable" },
  );
}
