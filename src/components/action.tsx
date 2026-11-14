"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Copy,
  Check,
  ArrowLeft,
  MessageSquareText,
  CheckCircle2,
  Info,
} from "lucide-react";
import { api, useData } from "@/lib/client";
import type { ActionView } from "@/lib/types";
import { money, parseMoney } from "@/lib/domain";
import { Badge, ErrorBox, Loading, PageTitle, Submit } from "./ui";
export function Action({ id }: { id: string }) {
  const { data, error, reload } = useData<ActionView>(`actions/${id}`);
  return error ? (
    <ErrorBox message={error} />
  ) : data ? (
    <ActionForm key={data.id} action={data} reload={reload} />
  ) : (
    <Loading />
  );
}
function ActionForm({
  action: a,
  reload,
}: {
  action: ActionView;
  reload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState(a.status);
  const [notes, setNotes] = useState(a.userNotes);
  const [response, setResponse] = useState(a.providerResponse);
  const event = a.savings[0];
  const [record, setRecord] = useState(!!event);
  const [previous, setPrevious] = useState(
    event ? (event.previousMonthlyCents / 100).toFixed(2) : "",
  );
  const [next, setNext] = useState(
    event ? (event.newMonthlyCents / 100).toFixed(2) : "",
  );
  const [effective, setEffective] = useState(
    event?.effectiveAt.slice(0, 10) || new Date().toISOString().slice(0, 10),
  );
  const [confirmed, setConfirmed] = useState(
    event?.confirmationStatus === "CONFIRMED",
  );
  const bill = a.opportunity.analysis.bill;
  const evidence = Array.isArray(a.opportunity.evidenceJson)
    ? a.opportunity.evidenceJson.filter(
        (e): e is string => typeof e === "string",
      )
    : [];
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`actions/${a.id}`, "PATCH", {
        status,
        userNotes: notes,
        providerResponse: response,
        ...(record
          ? {
              outcome: {
                previousMonthlyCents: parseMoney(previous),
                newMonthlyCents: parseMoney(next),
                effectiveAt: effective,
                confirmed,
                notes,
              },
            }
          : {}),
      });
      setSaved(true);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        className="back-link"
        href={`/analysis/${a.opportunity.analysisId}`}
      >
        <ArrowLeft size={15} /> Back to analysis
      </Link>
      <PageTitle
        eyebrow="YOUR NEXT CONVERSATION"
        title={a.opportunity.title}
        description={`A personalized starting point for your conversation with ${bill.serviceAccount.providerName}.`}
      />
      {bill.extractionVersion.startsWith("synthetic-") && (
        <div className="notice">
          <Info size={18} />
          <p>
            Fictional sample bill. This script is generated from synthetic
            statement data.
          </p>
        </div>
      )}
      {a.opportunity.analysis.status === "STALE" && (
        <div className="notice amber">
          <Info size={19} />
          <p>
            This script uses an earlier bill revision. Review the updated
            analysis before contacting your provider.
          </p>
        </div>
      )}
      <div className="action-layout">
        <section className="panel script-panel">
          <div className="panel-heading">
            <div className="heading-with-icon">
              <MessageSquareText size={20} />
              <h2>Your conversation script</h2>
            </div>
            <Badge tone="violet">Personalized template</Badge>
          </div>
          <div className="script-text">{a.script}</div>
          <button
            className="button primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(a.script);
                setCopied(true);
              } catch {
                setError(
                  "Clipboard access is unavailable. Select and copy the script text.",
                );
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Copied to clipboard" : "Copy script"}
          </button>
          <div className="script-tips">
            <h3>Keep these questions handy</h3>
            <ul>
              <li>What would my full recurring monthly total be?</li>
              <li>Does this affect my current bundle or promotional rate?</li>
              <li>Are there purchase costs, fees or contract requirements?</li>
              <li>Can you confirm the new terms in writing?</li>
            </ul>
          </div>
          <div className="bill-facts">
            <h3>The facts to bring</h3>
            <div>
              <span>Provider</span>
              <strong>{bill.serviceAccount.providerName}</strong>
            </div>
            <div>
              <span>Statement total</span>
              <strong>{money(bill.totalCents)}</strong>
            </div>
            {evidence.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        </section>
        <form className="panel outcome-form" onSubmit={save}>
          <div className="panel-heading">
            <div>
              <h2>How did it go?</h2>
              <p>Keep the response and your next step together.</p>
            </div>
          </div>
          <ErrorBox message={error} />
          <label className="field">
            Action status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                if (e.target.value !== "SUCCESSFUL") setConfirmed(false);
              }}
            >
              <option value="PLANNED">Planned</option>
              <option value="PENDING">Pending a response</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="UNSUCCESSFUL">Unsuccessful</option>
            </select>
          </label>
          <label className="field">
            Provider response
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              maxLength={2000}
              placeholder="What did your provider say?"
              rows={3}
            />
          </label>
          <label className="field">
            Your notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder="Reference number, next step, or follow-up details"
              rows={3}
            />
          </label>
          {a.opportunity.type !== "ONE_TIME_FEE" ? (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={record}
                  onChange={(e) => setRecord(e.target.checked)}
                />{" "}
                Record a recurring cost outcome
              </label>
              {record && (
                <div className="outcome-fields">
                  <label className="field">
                    Previous recurring cost (USD)
                    <input
                      required
                      inputMode="decimal"
                      value={previous}
                      onChange={(e) => setPrevious(e.target.value)}
                      placeholder="Before the change"
                    />
                  </label>
                  <label className="field">
                    New recurring cost (USD)
                    <input
                      required
                      inputMode="decimal"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      placeholder="After the change"
                    />
                  </label>
                  <label className="field">
                    Effective date
                    <input
                      required
                      type="date"
                      value={effective}
                      onChange={(e) => setEffective(e.target.value)}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={status !== "SUCCESSFUL"}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    My provider has confirmed this new recurring price.
                  </label>
                  <p className="tiny">
                    Only successful, confirmed and effective reductions count
                    toward confirmed savings. Use full recurring account totals;
                    exclude one-time credits. Future reductions count when
                    effective.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="tiny">
              Record one-time refunds in the response and notes. They are not
              recurring savings.
            </p>
          )}
          <Submit busy={busy}>
            Save outcome <CheckCircle2 size={17} />
          </Submit>
          {saved && (
            <p role="status" className="green-text">
              Outcome saved.
            </p>
          )}
          <Link className="inline-link" href="/dashboard">
            View your dashboard →
          </Link>
        </form>
      </div>
    </>
  );
}
