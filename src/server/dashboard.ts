import { db } from "./db";
import { confirmedSavings, potential, recurringCost } from "@/lib/domain";
export async function dashboard(workspaceId: string) {
  const accounts = await db.serviceAccount.findMany({
    where: { workspaceId },
    include: {
      bills: {
        orderBy: [
          { statementDate: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        include: {
          lineItems: true,
          analyses: {
            where: { status: "COMPLETE" },
            include: { opportunities: { include: { actions: true } } },
          },
        },
      },
      savings: { orderBy: { effectiveAt: "desc" } },
    },
  });
  const bills = accounts
    .flatMap((a) =>
      a.bills.map((b) => ({
        ...b,
        providerName: a.providerName,
        displayName: a.displayName,
      })),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  let monthly = 0;
  let possible = 0;
  let oneTime = 0;
  for (const account of accounts) {
    const bill = account.bills.find((b) => b.status === "CONFIRMED");
    if (!bill) continue;
    const cost = recurringCost(bill);
    monthly += cost;
    const analysis = bill.analyses.find(
      (a) => a.sourceVersion === bill.revision,
    );
    if (analysis) {
      const p = potential(analysis.opportunities, cost);
      possible += p.monthly;
      oneTime += p.oneTime;
    }
  }
  const actions = await db.actionPlan.findMany({
    where: {
      opportunity: { analysis: { bill: { serviceAccount: { workspaceId } } } },
    },
    include: {
      opportunity: { include: { analysis: { select: { status: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const events = accounts.flatMap((a) => a.savings);
  return {
    monthlyCostCents: monthly,
    potentialMonthlyCents: possible,
    potentialAnnualCents: possible * 12,
    oneTimeCents: oneTime,
    confirmed: confirmedSavings(events),
    analyzedBills: bills.filter((b) =>
      b.analyses.some((a) => a.sourceVersion === b.revision),
    ).length,
    billCount: bills.length,
    bills,
    actions,
    savings: events,
    accounts: accounts.map((a) => ({
      id: a.id,
      providerName: a.providerName,
      displayName: a.displayName,
    })),
    trend: bills
      .filter((b) => b.status === "CONFIRMED")
      .map((b) => ({
        id: b.id,
        date: (b.statementDate || b.createdAt).toISOString(),
        totalCents: b.totalCents ?? 0,
        providerName: b.providerName,
        accountId: b.serviceAccountId,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
