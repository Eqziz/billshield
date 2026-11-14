import { z } from "zod";
export const categories = [
  "SERVICE",
  "EQUIPMENT",
  "ADDON",
  "DISCOUNT",
  "TAX",
  "ONE_TIME",
  "OTHER",
] as const;
export const centsSchema = z.number().int().min(0).max(100_000_000);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Use a valid calendar date.");
export const lineSchema = z.object({
  description: z.string().trim().min(1).max(200),
  category: z.enum(categories),
  amountCents: z.number().int().min(-100_000_000).max(100_000_000),
  recurrenceType: z.enum(["MONTHLY", "ONE_TIME", "UNKNOWN"]),
  confidence: z.number().min(0).max(1).default(1),
  evidence: z.string().max(500).default("Entered by user"),
});
export const billSchema = z
  .object({
    providerName: z.string().trim().min(1).max(100),
    displayName: z.string().trim().min(1).max(100).default("Home internet"),
    serviceAccountId: z.string().max(100).optional(),
    totalCents: centsSchema.nullable(),
    periodStart: dateSchema.nullable().default(null),
    periodEnd: dateSchema.nullable().default(null),
    statementDate: dateSchema.nullable().default(null),
    dueDate: dateSchema.nullable().default(null),
    lineItems: z.array(lineSchema).max(80),
    discrepancyAcknowledged: z.boolean().default(false),
  })
  .refine(
    (v) => !v.periodStart || !v.periodEnd || v.periodStart <= v.periodEnd,
    { message: "Billing period ends before it starts." },
  );
export type BillInput = z.infer<typeof billSchema>;
export type LineInput = z.infer<typeof lineSchema>;
export const actionSchema = z.object({
  status: z.enum(["PLANNED", "PENDING", "SUCCESSFUL", "UNSUCCESSFUL"]),
  userNotes: z.string().max(2000).default(""),
  providerResponse: z.string().max(2000).default(""),
  outcome: z
    .object({
      previousMonthlyCents: centsSchema,
      newMonthlyCents: centsSchema,
      effectiveAt: dateSchema,
      confirmed: z.boolean(),
      notes: z.string().max(2000).default(""),
    })
    .optional(),
});
