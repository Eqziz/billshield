"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Router,
  PlusCircle,
  Clock3,
  ReceiptText,
  TrendingUp,
  MessageSquareText,
  PenLine,
  Info,
} from "lucide-react";
import { api, useData } from "@/lib/client";
import type { AnalysisView } from "@/lib/types";
import { money, potential, recurringCost } from "@/lib/domain";
import { Badge, ErrorBox, Loading, PageTitle, Stat } from "./ui";
const icons: Record<string, typeof Router> = {
  EQUIPMENT_RENTAL: Router,
  OPTIONAL_ADDON: PlusCircle,
  PROMO_EXPIRATION: Clock3,
  ONE_TIME_FEE: ReceiptText,
  BILL_INCREASE: TrendingUp,
  RETENTION_REVIEW: MessageSquareText,
};
export function Analysis({ id }: { id: string }) {
  const { data, error } = useData<AnalysisView>(`analyses/${id}`);
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const router = useRouter();
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const p = potential(data.opportunities, recurringCost(data.bill));
  const stale =
    data.status !== "COMPLETE" || data.sourceVersion !== data.bill.revision;
  async function act(opId: string) {
    setBusy(opId);
    setActionError("");
    try {
      const result = await api<{ id: string }>(
        `opportunities/${opId}/actions`,
        "POST",
      );
      router.push(`/actions/${result.id}`);
    } catch (e) {
      setActionError((e as Error).message);
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="STEP 3 OF 3 · SEE YOUR OPTIONS"
        title="A clearer bill. A better next step."
        description={`${data.bill.serviceAccount.providerName} · ${data.bill.statementDate?.slice(0, 10) || "Statement date not set"} · Rules-based analysis`}
        action={
          <Link href={`/bills/${data.billId}`} className="button secondary">
            <PenLine size={16} /> Review bill
          </Link>
        }
      />
      {data.bill.extractionVersion.startsWith("synthetic-") && (
        <div className="notice">
          <Info size={18} />
          <p>
            Fictional sample bill. These results were calculated from the
            labeled synthetic PDF you uploaded.
          </p>
        </div>
      )}
      {stale && (
        <div className="notice amber">
          <Info size={20} />
          <p>
            This analysis is from an earlier bill revision. Review, confirm and
            analyze the bill again before acting on it.
          </p>
          <Link href={`/bills/${data.billId}`} className="inline-link">
            Update analysis <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <ErrorBox message={actionError} />
      <div className="analysis-summary">
        <div className="analysis-summary-main">
          <span className="summary-icon">
            <ShieldCheck size={28} />
          </span>
          <p className="eyebrow">POTENTIAL RECURRING SAVINGS</p>
          <strong>
            $0–{money(p.monthly).slice(1)}
            <span>/month</span>
          </strong>
          <p>
            Up to {money(p.annual)} annualized, if eligible charges can be
            removed.
            <br />
            Provider approval and any equipment purchase costs matter.
          </p>
          <Badge tone="green">Estimates, never guarantees</Badge>
        </div>
        <div className="analysis-summary-side">
          <Stat
            label="Current statement"
            value={money(data.bill.totalCents)}
            note={`${data.bill.lineItems.length} reviewed line items`}
          />
          <Stat
            label="One-time fees to review"
            value={money(p.oneTime)}
            note="Excluded from recurring savings"
          />
        </div>
      </div>
      <div className="section-label">
        <div>
          <h2>Your opportunities</h2>
          <p>Grounded in your bill. Built around questions worth asking.</p>
        </div>
        <Badge>{data.opportunities.length} next steps</Badge>
      </div>
      {p.monthly === 0 && (
        <div className="notice">
          <Info size={19} />
          <p>
            No quantified recurring savings opportunities were found. The review
            questions below can still help clarify your plan. No unverified
            discount is included.
          </p>
        </div>
      )}
      <div className="opportunity-grid">
        {data.opportunities.map((op) => {
          const Icon = icons[op.type] || ReceiptText;
          const evidence = Array.isArray(op.evidenceJson)
            ? op.evidenceJson.filter((e): e is string => typeof e === "string")
            : [];
          return (
            <article className="panel opportunity" key={op.id}>
              <div className="opportunity-top">
                <span
                  className={`icon-tile ${op.type === "EQUIPMENT_RENTAL" ? "violet" : ""}`}
                >
                  <Icon size={22} />
                </span>
                <Badge tone={op.maxMonthlySavingsCents ? "green" : "neutral"}>
                  {op.maxMonthlySavingsCents
                    ? `$0–${money(op.maxMonthlySavingsCents).slice(1)}/mo`
                    : op.oneTimeSavingsCents
                      ? `Up to ${money(op.oneTimeSavingsCents)} once`
                      : "Review & clarify"}
                </Badge>
              </div>
              <h2>{op.title}</h2>
              <p>{op.explanation}</p>
              <div className="evidence-box">
                <span>FROM YOUR BILL</span>
                {evidence.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
              <details className="assumptions">
                <summary>
                  Conditions & assumptions <PlusCircle size={14} />
                </summary>
                <p>{op.assumptions}</p>
                <p>
                  Verification: {op.verificationStatus.toLowerCase()}. Current
                  relevant charge: {money(op.currentChargeCents)}.
                </p>
              </details>
              <div className="opportunity-bottom">
                <small>Provider confirmation required</small>
                <button
                  className="button secondary small"
                  disabled={stale || !!busy}
                  onClick={() => act(op.id)}
                >
                  {busy === op.id
                    ? "Preparing…"
                    : op.actions.length
                      ? "Open action"
                      : "Prepare my script"}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="analysis-footnote">
        <Info size={15} /> BillShield helps you prepare. You decide what to
        change. Potential annual savings assume 12 unchanged months and exclude
        one-time credits.
      </p>
    </>
  );
}
