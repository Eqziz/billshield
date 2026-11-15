"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, Save, AlertTriangle } from "lucide-react";
import { api, initialize } from "@/lib/client";
import { money, parseMoney } from "@/lib/domain";
import { categories, billSchema } from "@/lib/validation";
import type { BillView, DashboardView } from "@/lib/types";
import { ErrorBox, Submit } from "./ui";
type Row = {
  description: string;
  category: (typeof categories)[number];
  amount: string;
  recurrenceType: "MONTHLY" | "ONE_TIME" | "UNKNOWN";
  confidence: number;
  evidence: string;
};
export function BillForm({
  bill,
  accounts,
  onCancel,
}: {
  bill?: BillView;
  accounts: DashboardView["accounts"];
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(
    bill?.serviceAccount.providerName || "",
  );
  const [displayName, setDisplayName] = useState(
    bill?.serviceAccount.displayName || "Home internet",
  );
  const [accountId, setAccountId] = useState("");
  const [total, setTotal] = useState(
    bill?.totalCents != null ? (bill.totalCents / 100).toFixed(2) : "",
  );
  const [dates, setDates] = useState({
    periodStart: bill?.periodStart?.slice(0, 10) || "",
    periodEnd: bill?.periodEnd?.slice(0, 10) || "",
    statementDate: bill?.statementDate?.slice(0, 10) || "",
    dueDate: bill?.dueDate?.slice(0, 10) || "",
  });
  const [rows, setRows] = useState<Row[]>(
    bill?.lineItems.map((l) => ({
      ...l,
      category: l.category as Row["category"],
      recurrenceType: l.recurrenceType as Row["recurrenceType"],
      amount: (l.amountCents / 100).toFixed(2),
    })) || [],
  );
  const [ack, setAck] = useState(bill?.discrepancyAcknowledged || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  let sum = 0;
  let statement = 0;
  let valid = true;
  try {
    sum = rows.reduce((s, l) => s + parseMoney(l.amount), 0);
    statement = total ? parseMoney(total) : 0;
  } catch {
    valid = false;
  }
  const mismatch = valid && sum !== statement;
  function row(index: number, key: keyof Row, value: string) {
    setRows((r) =>
      r.map((l, i) =>
        i === index
          ? { ...l, [key]: value, confidence: 1, evidence: "Corrected by user" }
          : l,
      ),
    );
    setSaved("");
  }
  async function save(confirm: boolean) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const data = billSchema.parse({
        providerName: provider,
        displayName,
        serviceAccountId: accountId || undefined,
        totalCents: parseMoney(total),
        ...Object.fromEntries(
          Object.entries(dates).map(([k, v]) => [k, v || null]),
        ),
        lineItems: rows.map(({ amount, ...l }) => ({
          ...l,
          amountCents: parseMoney(amount),
        })),
        discrepancyAcknowledged: ack,
      });
      await initialize();
      const result = await api<BillView>(
        bill ? `bills/${bill.id}` : "bills",
        bill ? "PATCH" : "POST",
        data,
      );
      if (confirm) {
        await api(`bills/${result.id}/confirm`, "POST");
        const analysis = await api<{ id: string }>(
          `bills/${result.id}/analyze`,
          "POST",
        );
        router.push(`/analysis/${analysis.id}`);
      } else {
        setSaved("Draft saved.");
        if (!bill) router.push(`/bills/${result.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bill.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="bill-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save(true);
      }}
    >
      <ErrorBox message={error} />
      {bill?.extractionVersion.includes("manual-required") && (
        <div className="notice amber">
          <AlertTriangle size={20} />
          <p>
            No usable bill text was recognized, including image OCR. Enter or
            correct the details below.
          </p>
        </div>
      )}
      {bill?.extractionVersion.includes("ocr-") && (
        <div className="notice amber">
          <AlertTriangle size={18} />
          <p>
            Image OCR was used for this document. Check every amount against the
            original image. English image text is supported on up to 5 pages.
            {bill.extractionVersion.includes("partial") ||
            bill.extractionVersion.includes("incomplete")
              ? " Some image text could not be processed; add any missing details manually."
              : ""}
          </p>
        </div>
      )}
      {bill && bill.extractionVersion !== "manual-v1" && (
        <div className="notice">
          <AlertTriangle size={18} />
          <p>
            {bill.extractionVersion.startsWith("synthetic-")
              ? "Fictional sample bill · "
              : ""}
            {bill.extractionVersion.includes("ai-assisted-v1")
              ? "AI-assisted extraction"
              : bill.extractionVersion.includes("ocr-")
                ? "PDF image OCR"
                : "Deterministic text extraction"}{" "}
            · Verify all amounts and dates against your original statement.
            Extraction confidence is not a guarantee of accuracy.
          </p>
        </div>
      )}
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>Statement details</h2>
            <p>Only the information needed to understand your bill.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            Provider name
            <input
              required
              maxLength={100}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. Spectrum"
            />
          </label>
          <label className="field">
            Account label
            <input
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Home internet"
            />
          </label>
          {accounts.length > 0 && (
            <label className="field full">
              Link to service account
              <select
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  const a = accounts.find((a) => a.id === e.target.value);
                  if (a) {
                    setProvider(a.providerName);
                    setDisplayName(a.displayName);
                  }
                }}
              >
                <option value="">
                  {bill
                    ? "Keep current account and update its label"
                    : "New service account"}
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.providerName} · {a.displayName}
                  </option>
                ))}
              </select>
              <small>
                Choose the same account to compare successive bills. Account
                labels do not include account numbers.
              </small>
            </label>
          )}
          <label className="field">
            Statement total (USD)
            <div className="currency-input">
              <span>$</span>
              <input
                required
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                aria-label="Statement total (USD)"
              />
            </div>
          </label>
          {Object.entries(dates).map(([key, value]) => (
            <label className="field" key={key}>
              {
                {
                  periodStart: "Period start",
                  periodEnd: "Period end",
                  statementDate: "Statement date",
                  dueDate: "Due date",
                }[key]
              }
              <input
                type="date"
                value={value}
                onChange={(e) =>
                  setDates((d) => ({ ...d, [key]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>Your charges</h2>
            <p>
              Edit, add or remove line items. Enter discounts as negative
              amounts.
            </p>
          </div>
          <button
            type="button"
            className="button secondary small"
            onClick={() =>
              setRows((r) => [
                ...r,
                {
                  description: "",
                  category: "OTHER",
                  amount: "0.00",
                  recurrenceType: "UNKNOWN",
                  confidence: 1,
                  evidence: "Entered by user",
                },
              ])
            }
            disabled={rows.length >= 80}
          >
            <Plus size={15} /> Add charge
          </button>
        </div>
        <div className="line-items">
          {!rows.length && (
            <p className="panel-empty">
              No charges entered yet. Add the line items shown on your
              statement.
            </p>
          )}
          {rows.map((l, i) => (
            <div className="line-item" key={i}>
              <div className="line-item-main">
                <label className="field">
                  Charge description
                  <input
                    required
                    maxLength={200}
                    value={l.description}
                    onChange={(e) => row(i, "description", e.target.value)}
                    aria-label={`Charge ${i + 1} description`}
                  />
                </label>
                <label className="field amount-field">
                  Amount (USD)
                  <input
                    required
                    inputMode="decimal"
                    value={l.amount}
                    onChange={(e) => row(i, "amount", e.target.value)}
                    aria-label={`Charge ${i + 1} amount`}
                  />
                </label>
                <button
                  className="icon-button danger"
                  type="button"
                  aria-label={`Remove charge ${i + 1}`}
                  onClick={() =>
                    setRows((r) => r.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="line-item-meta">
                <label>
                  Category
                  <select
                    aria-label={`Charge ${i + 1} category`}
                    value={l.category}
                    onChange={(e) => row(i, "category", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option value={c} key={c}>
                        {c.toLowerCase().replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Frequency
                  <select
                    aria-label={`Charge ${i + 1} recurrence`}
                    value={l.recurrenceType}
                    onChange={(e) => row(i, "recurrenceType", e.target.value)}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="ONE_TIME">One time</option>
                    <option value="UNKNOWN">Unconfirmed</option>
                  </select>
                </label>
                {l.confidence < 0.8 && (
                  <span className="low-confidence">Check extraction</span>
                )}
              </div>
              {l.evidence && l.evidence !== "Entered by user" && (
                <p className="evidence-line">Evidence: {l.evidence}</p>
              )}
            </div>
          ))}
        </div>
        <div className="reconciliation">
          <span>
            Line-item total{" "}
            <strong>{valid ? money(sum) : "Check amounts"}</strong>
          </span>
          <span>
            Statement total{" "}
            <strong>{valid ? money(statement) : "Check amount"}</strong>
          </span>
          <span className={mismatch ? "amber-text" : "green-text"}>
            {valid
              ? mismatch
                ? `Difference: ${money(statement - sum)}`
                : "Totals match"
              : "Enter valid dollar amounts"}
          </span>
        </div>
        {mismatch && (
          <div className="notice amber">
            <AlertTriangle size={19} />
            <div>
              <p>
                These totals differ. We will preserve both values. Check for
                missing charges, credits, past-due balances or payments.
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />{" "}
                I have reviewed and acknowledge this discrepancy.
              </label>
            </div>
          </div>
        )}
      </section>
      <div className="form-actions">
        <div>
          {onCancel && (
            <button type="button" className="button ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void save(false)}
          >
            <Save size={16} /> Save draft
          </button>
          <span className="green-text" role="status">
            {saved}
          </span>
        </div>
        <Submit busy={busy}>
          Confirm & analyze <ArrowRight size={17} />
        </Submit>
      </div>
      <p className="tiny">
        By confirming, you verify that these values represent your statement.
        Changes supersede earlier analyses.
      </p>
    </form>
  );
}
