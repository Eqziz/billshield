import type { BillInput, LineInput } from "./validation";
export function money(cents: number | null) {
  if (cents === null) return "Not found";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
export function parseMoney(input: string): number {
  const value = input.trim().replace(/\$/g, "").replace(/,/g, "");
  const negative = value.startsWith("(") && value.endsWith(")");
  const clean = negative ? value.slice(1, -1) : value;
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean))
    throw new Error("Enter a dollar amount with up to two decimal places.");
  const sign = clean.startsWith("-") ? -1 : 1;
  const [whole, fraction = ""] = clean.replace("-", "").split(".");
  const result =
    (Number(whole) * 100 + Number(fraction.padEnd(2, "0"))) *
    sign *
    (negative ? -1 : 1);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100_000_000)
    throw new Error("Amount is out of range.");
  return result;
}
export function normalizeDate(value: string): string | null {
  const iso = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const us = value.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  const str = iso
    ? iso[0]
    : us
      ? `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`
      : null;
  if (!str) return null;
  const d = new Date(str);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str
    ? str
    : null;
}
export function classify(
  description: string,
): Pick<LineInput, "category" | "recurrenceType"> {
  if (
    /activation|installation|late fee|one.time|technician|purchase|equipment sale/i.test(
      description,
    )
  )
    return { category: "ONE_TIME", recurrenceType: "ONE_TIME" };
  if (/discount|credit|promo.*(?:saving|discount)/i.test(description))
    return { category: "DISCOUNT", recurrenceType: "MONTHLY" };
  if (/rental|leased|equipment|modem|router|gateway/i.test(description))
    return {
      category: "EQUIPMENT",
      recurrenceType: /rental|lease|monthly/i.test(description)
        ? "MONTHLY"
        : "UNKNOWN",
    };
  if (
    /security|protection|streaming|premium|addon|add-on|wifi plus/i.test(
      description,
    )
  )
    return { category: "ADDON", recurrenceType: "MONTHLY" };
  if (/tax|surcharge|regulatory/i.test(description))
    return { category: "TAX", recurrenceType: "MONTHLY" };
  if (/internet|broadband|fiber|service|plan/i.test(description))
    return { category: "SERVICE", recurrenceType: "MONTHLY" };
  return { category: "OTHER", recurrenceType: "UNKNOWN" };
}
export type Finding = {
  type: string;
  title: string;
  explanation: string;
  evidenceJson: string[];
  currentChargeCents: number;
  minMonthlySavingsCents: number;
  maxMonthlySavingsCents: number;
  oneTimeSavingsCents: number;
  overlapGroup: string;
  assumptions: string;
  nextStep: string;
};
export type AnalyzableBill = {
  totalCents: number;
  lineItems: BillInput["lineItems"];
};
export function recurringCost(bill: {
  totalCents: number | null;
  lineItems: { recurrenceType: string; amountCents: number }[];
}) {
  return Math.max(
    0,
    (bill.totalCents ?? 0) -
      bill.lineItems
        .filter((l) => l.recurrenceType === "ONE_TIME")
        .reduce((s, l) => s + l.amountCents, 0),
  );
}
export function analyze(
  bill: AnalyzableBill,
  previous?: AnalyzableBill,
): Finding[] {
  const result: Finding[] = [];
  for (const [index, line] of bill.lineItems.entries()) {
    const common = {
      evidenceJson: [
        line.evidence || `${line.description}: ${money(line.amountCents)}`,
      ],
      currentChargeCents: line.amountCents,
      minMonthlySavingsCents: 0,
      maxMonthlySavingsCents: 0,
      oneTimeSavingsCents: 0,
      overlapGroup: `line-${index}`,
    };
    if (
      line.category === "EQUIPMENT" &&
      line.amountCents > 0 &&
      line.recurrenceType === "MONTHLY"
    )
      result.push({
        ...common,
        type: "EQUIPMENT_RENTAL",
        title: "Review your equipment charge",
        explanation: `Your bill includes ${money(line.amountCents)} for ${line.description}. Ask if this is a rental that can be avoided.`,
        maxMonthlySavingsCents: line.amountCents,
        assumptions:
          "Provider must support customer-owned equipment and removal of this fee. Purchase costs and compatibility may offset savings.",
        nextStep:
          "Ask for supported equipment and the exact fee removal requirements.",
      });
    if (
      line.category === "ADDON" &&
      line.amountCents > 0 &&
      line.recurrenceType === "MONTHLY"
    )
      result.push({
        ...common,
        type: "OPTIONAL_ADDON",
        title: "Decide whether this add-on earns its keep",
        explanation: `Review ${line.description} (${money(line.amountCents)}/month) and whether you use it.`,
        maxMonthlySavingsCents: line.amountCents,
        assumptions:
          "Provider must confirm this service is optional and cancellable without affecting your bundle price.",
        nextStep:
          "Ask whether this add-on can be removed and what the new total would be.",
      });
    if (line.recurrenceType === "ONE_TIME" && line.amountCents > 0)
      result.push({
        ...common,
        type: "ONE_TIME_FEE",
        title: "Check this one-time fee",
        explanation: `${line.description} adds ${money(line.amountCents)} to this statement only.`,
        oneTimeSavingsCents: line.amountCents,
        assumptions:
          "A refund is possible only if the provider agrees the fee is incorrect or waivable. Not included in monthly or annual savings.",
        nextStep:
          "Request an explanation and, if appropriate, a one-time adjustment.",
      });
    if (line.category === "DISCOUNT" && line.amountCents < 0)
      result.push({
        ...common,
        type: "PROMO_EXPIRATION",
        title: "Protect your promotional discount",
        explanation: `Your statement documents ${line.description}, worth ${money(-line.amountCents)}. ${/expir|ends/i.test(line.evidence) ? "An end date or expiration is mentioned in the evidence." : "No expiration date was verified; ask when it ends."}`,
        assumptions:
          "This is an existing discount, not additional savings. Future pricing and expiration require provider confirmation.",
        nextStep:
          "Confirm the expiration date and your price after the promotion.",
      });
  }
  if (previous) {
    const increase = recurringCost(bill) - recurringCost(previous);
    if (increase > 0)
      result.push({
        type: "BILL_INCREASE",
        title: "Your recurring cost increased",
        explanation: `Recurring charges rose from ${money(recurringCost(previous))} to ${money(recurringCost(bill))}, an increase of ${money(increase)}.`,
        evidenceJson: [
          `Previous recurring total ${money(recurringCost(previous))}; current ${money(recurringCost(bill))}. One-time items excluded.`,
        ],
        currentChargeCents: increase,
        minMonthlySavingsCents: 0,
        maxMonthlySavingsCents: 0,
        oneTimeSavingsCents: 0,
        overlapGroup: "review",
        assumptions:
          "Bills must belong to the same account. Different service periods or plan changes can explain the increase. No recoverable amount is assumed.",
        nextStep:
          "Ask which charges changed and whether a lower recurring rate is available.",
      });
  }
  result.push({
    type: "RETENTION_REVIEW",
    title: "Ask about your available options",
    explanation:
      "Ask your provider to review the current plan and any loyalty or retention offers available to your account.",
    evidenceJson: [`Current statement total: ${money(bill.totalCents)}.`],
    currentChargeCents: recurringCost(bill),
    minMonthlySavingsCents: 0,
    maxMonthlySavingsCents: 0,
    oneTimeSavingsCents: 0,
    overlapGroup: "review",
    assumptions:
      "No offer is verified and no hypothetical discount is included in savings estimates.",
    nextStep:
      "Ask for the full recurring price, duration, fees and any contract requirements in writing.",
  });
  return result;
}
export function potential(
  findings: Pick<
    Finding,
    "overlapGroup" | "maxMonthlySavingsCents" | "oneTimeSavingsCents"
  >[],
  monthlyCost: number,
) {
  const groups = new Map<string, number>();
  let oneTime = 0;
  for (const f of findings) {
    groups.set(
      f.overlapGroup,
      Math.max(groups.get(f.overlapGroup) || 0, f.maxMonthlySavingsCents),
    );
    oneTime += f.oneTimeSavingsCents;
  }
  const monthly = Math.min(
    monthlyCost,
    [...groups.values()].reduce((a, b) => a + b, 0),
  );
  return { monthly, annual: monthly * 12, oneTime };
}
export type SavingsRecord = {
  serviceAccountId: string;
  previousMonthlyCents: number;
  newMonthlyCents: number;
  effectiveAt: Date | string;
  confirmationStatus: string;
  createdAt: Date | string;
};
export function confirmedSavings(events: SavingsRecord[], now = new Date()) {
  const accounts = new Map<string, SavingsRecord[]>();
  for (const event of events)
    if (
      event.confirmationStatus === "CONFIRMED" &&
      new Date(event.effectiveAt) <= now
    )
      accounts.set(event.serviceAccountId, [
        ...(accounts.get(event.serviceAccountId) || []),
        event,
      ]);
  let monthly = 0;
  for (const list of accounts.values()) {
    list.sort(
      (a, b) =>
        new Date(a.effectiveAt).getTime() - new Date(b.effectiveAt).getTime() ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    monthly += Math.max(
      0,
      list[0].previousMonthlyCents - list[list.length - 1].newMonthlyCents,
    );
  }
  return { monthly, annual: monthly * 12 };
}
export function negotiationScript(
  provider: string,
  total: number,
  finding: Pick<Finding, "type" | "title" | "nextStep" | "currentChargeCents">,
  descriptions: string[],
) {
  return `Hi, I'm reviewing my latest ${provider} home internet statement of ${money(total)}.\n\n${finding.title}. ${descriptions.join(" ")}\n\n${finding.nextStep}\n\nBefore I agree to any changes, please confirm my new total monthly cost, the effective date, any one-time charges, promotional end dates, and any contract or cancellation terms. Could you send the details in writing?`;
}
