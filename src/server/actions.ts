import { db } from "./db";
import { ApiError, notFound } from "./security";
import { actionSchema } from "@/lib/validation";
export async function getAction(workspaceId: string, id: string) {
  return (
    (await db.actionPlan.findFirst({
      where: {
        id,
        opportunity: {
          analysis: { bill: { serviceAccount: { workspaceId } } },
        },
      },
      include: {
        savings: true,
        opportunity: {
          include: {
            analysis: {
              include: { bill: { include: { serviceAccount: true } } },
            },
          },
        },
      },
    })) ?? notFound()
  );
}
export async function updateAction(
  workspaceId: string,
  id: string,
  raw: unknown,
) {
  const data = actionSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      const action = await tx.actionPlan.findFirst({
        where: {
          id,
          opportunity: {
            analysis: { bill: { serviceAccount: { workspaceId } } },
          },
        },
        include: {
          opportunity: { include: { analysis: { include: { bill: true } } } },
        },
      });
      if (!action) notFound();
      const bill = action.opportunity.analysis.bill;
      if (data.outcome && action.opportunity.type === "ONE_TIME_FEE")
        throw new ApiError(
          422,
          "ONE_TIME_OUTCOME",
          "One-time fee refunds cannot be recorded as recurring savings. Record the provider response in notes.",
        );
      if (
        data.outcome &&
        data.outcome.newMonthlyCents > data.outcome.previousMonthlyCents &&
        data.status === "SUCCESSFUL"
      )
        throw new ApiError(
          422,
          "INVALID_REDUCTION",
          "A successful reduction cannot increase your recurring cost.",
        );
      if (data.outcome?.confirmed && data.status !== "SUCCESSFUL")
        throw new ApiError(
          422,
          "CONFIRMATION_STATUS",
          "Confirmed savings require a successful action status.",
        );
      await tx.actionPlan.update({
        where: { id },
        data: {
          status: data.status,
          userNotes: data.userNotes,
          providerResponse: data.providerResponse,
        },
      });
      if (data.outcome) {
        const o = data.outcome;
        const fields = {
          serviceAccountId: bill.serviceAccountId,
          previousMonthlyCents: o.previousMonthlyCents,
          newMonthlyCents: o.newMonthlyCents,
          effectiveAt: new Date(o.effectiveAt),
          confirmationStatus: o.confirmed ? "CONFIRMED" : "UNCONFIRMED",
          notes: o.notes,
        };
        await tx.savingsEvent.upsert({
          where: { actionPlanId: id },
          create: { actionPlanId: id, ...fields },
          update: fields,
        });
      } else await tx.savingsEvent.deleteMany({ where: { actionPlanId: id } });
      return tx.actionPlan.findUniqueOrThrow({
        where: { id },
        include: { savings: true },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
