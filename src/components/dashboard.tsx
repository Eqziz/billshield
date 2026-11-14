"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  FileText,
  Clock3,
  MessageSquareText,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { useData } from "@/lib/client";
import type { DashboardView } from "@/lib/types";
import { money } from "@/lib/domain";
import { Badge, Empty, ErrorBox, Loading, PageTitle, Stat } from "./ui";
export function Dashboard() {
  const { data, error } = useData<DashboardView>("dashboard/summary");
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const open = data.actions.filter((a) =>
    ["PLANNED", "PENDING"].includes(a.status),
  );
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE CLARITY GOES A LONG WAY"
        title="Your bills, in perspective."
        description="Know what you pay. Understand your options. Track what changes."
        action={
          <Link href="/bills/new" className="button primary">
            <Plus size={17} /> Analyze a bill
          </Link>
        }
      />
      <div className="stats-grid">
        <Stat
          label="Monthly expenses"
          value={money(data.monthlyCostCents)}
          note="Latest confirmed bill per account"
        />
        <Stat
          label="Potential monthly savings"
          value={`$0–${money(data.potentialMonthlyCents).slice(1)}`}
          note={`Up to ${money(data.potentialAnnualCents)}/year · conditional`}
        />
        <Stat
          label="Confirmed annualized savings"
          value={money(data.confirmed.annual)}
          note={`${money(data.confirmed.monthly)}/mo · recorded by you`}
          green
        />
        <Stat
          label="Bills analyzed"
          value={String(data.analyzedBills).padStart(2, "0")}
          note={`${data.billCount} bill${data.billCount === 1 ? "" : "s"} in your workspace`}
        />
      </div>
      {!data.billCount ? (
        <Empty
          title="A clearer picture starts with one bill."
          description="Upload your internet bill to understand your charges and find your next step. Or explore with a labeled sample PDF."
        />
      ) : (
        <>
          <div className="dashboard-columns">
            <section className="panel trend-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your bill history</h2>
                  <p>Confirmed statement totals, including one-time fees.</p>
                </div>
                <Badge>USD</Badge>
              </div>
              {data.trend.length ? (
                <div
                  className="trend-chart"
                  aria-label="Bill statement history"
                >
                  {data.trend.slice(-10).map((b) => (
                    <Link
                      key={b.id}
                      href={`/bills/${b.id}`}
                      className="trend-column"
                      title={`${b.providerName}: ${money(b.totalCents)}`}
                    >
                      <span>{money(b.totalCents)}</span>
                      <div className="bar-track">
                        <div
                          className="bar"
                          style={{
                            height: `${Math.max(3, (b.totalCents / Math.max(1, ...data.trend.map((t) => t.totalCents))) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {new Date(b.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </strong>
                      <small>{b.providerName}</small>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="panel-empty">
                  Confirm a bill to start your history.
                </div>
              )}
            </section>
            <section className="next-step-card">
              <span className="icon-tile">
                <MessageSquareText size={24} />
              </span>
              <p className="eyebrow">CLARITY INTO ACTION</p>
              <h2>
                Your next conversation
                <br />
                could change things.
              </h2>
              <p>
                Start with the facts, ask the right questions, and record what
                your provider says.
              </p>
              <Link href="/actions" className="button white-button">
                Open action center <ArrowUpRight size={17} />
              </Link>
              <div className="next-step-count">
                <Clock3 size={15} />
                {open.length} open action{open.length === 1 ? "" : "s"} to
                follow up
              </div>
            </section>
          </div>
          <div className="dashboard-columns lower-columns">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent bills</h2>
                  <p>Your latest documents and analyses.</p>
                </div>
                <Link href="/bills" className="inline-link">
                  View all <ArrowRight size={15} />
                </Link>
              </div>
              <BillList bills={data.bills.slice(0, 4)} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Action plans</h2>
                  <p>Small next steps, all in one place.</p>
                </div>
                <span className="count">{data.actions.length}</span>
              </div>
              {data.actions.slice(0, 4).map((a) => (
                <Link
                  href={`/actions/${a.id}`}
                  className="action-row"
                  key={a.id}
                >
                  <span
                    className={`row-icon ${a.status === "SUCCESSFUL" ? "green" : ""}`}
                  >
                    {a.status === "SUCCESSFUL" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <MessageSquareText size={18} />
                    )}
                  </span>
                  <div>
                    <strong>{a.opportunity.title}</strong>
                    <small>
                      {a.opportunity.analysis.status === "STALE"
                        ? "Based on an earlier bill revision"
                        : a.status.toLowerCase()}
                    </small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {!data.actions.length && (
                <div className="panel-empty">
                  Analyze a confirmed bill to create your first action plan.
                </div>
              )}
            </section>
          </div>
          {data.savings.length > 0 && (
            <section className="panel outcomes">
              <div className="panel-heading">
                <div>
                  <h2>Recorded outcomes</h2>
                  <p>
                    Each account uses its earliest baseline and latest effective
                    confirmed cost to avoid double counting.
                  </p>
                </div>
                <TrendingDown size={20} />
              </div>
              {data.savings.map((e) => (
                <div className="outcome-row" key={e.id}>
                  <div>
                    <strong>
                      {
                        data.accounts.find((a) => a.id === e.serviceAccountId)
                          ?.providerName
                      }
                    </strong>
                    <small>Effective {e.effectiveAt.slice(0, 10)}</small>
                  </div>
                  <span>
                    {money(e.previousMonthlyCents)} → {money(e.newMonthlyCents)}
                    /mo
                  </span>
                  <Badge
                    tone={
                      e.confirmationStatus === "CONFIRMED" ? "green" : "amber"
                    }
                  >
                    {e.confirmationStatus === "CONFIRMED"
                      ? "User confirmed"
                      : "Unconfirmed"}
                  </Badge>
                </div>
              ))}
            </section>
          )}
        </>
      )}
      <div className="workspace-note">
        <span className="live-dot" /> Private guest workspace <span>·</span>{" "}
        Your data stays for 7 days{" "}
        <Link href="/settings">
          Manage your data <ArrowRight size={13} />
        </Link>
      </div>
    </>
  );
}
export function BillList({ bills }: { bills: DashboardView["bills"] }) {
  return (
    <div className="bill-list">
      {bills.map((b) => {
        const analysis = b.analyses.find((a) => a.sourceVersion === b.revision);
        return (
          <Link
            key={b.id}
            href={analysis ? `/analysis/${analysis.id}` : `/bills/${b.id}`}
            className="bill-row"
          >
            <span className="row-icon">
              <FileText size={20} />
            </span>
            <div>
              <strong>{b.providerName}</strong>
              <small>
                {b.extractionVersion.startsWith("synthetic-")
                  ? "Sample · "
                  : ""}
                {b.statementDate
                  ? new Date(b.statementDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })
                  : "Statement date not set"}{" "}
                · {b.displayName}
              </small>
            </div>
            <Badge
              tone={
                analysis
                  ? "green"
                  : b.status === "CONFIRMED"
                    ? "violet"
                    : "amber"
              }
            >
              {analysis
                ? "Analyzed"
                : b.status === "CONFIRMED"
                  ? "Confirmed"
                  : "Needs review"}
            </Badge>
            <strong className="bill-price">{money(b.totalCents)}</strong>
            <ArrowUpRight size={16} />
          </Link>
        );
      })}
    </div>
  );
}
export function Bills() {
  const { data, error } = useData<DashboardView>("dashboard/summary");
  return (
    <>
      <PageTitle
        eyebrow="YOUR STATEMENTS"
        title="Every bill. A clearer picture."
        description="Upload, review and revisit your internet statements."
        action={
          <Link className="button primary" href="/bills/new">
            <Plus size={17} /> Add a bill
          </Link>
        }
      />
      <ErrorBox message={error} />
      {!data && !error ? (
        <Loading />
      ) : data?.billCount ? (
        <section className="panel">
          <BillList bills={data.bills} />
        </section>
      ) : !error ? (
        <Empty
          title="Your bills belong here."
          description="Start with a PDF or enter the details manually. Every analysis begins with data you review."
        />
      ) : null}
    </>
  );
}
export function Actions() {
  const { data, error } = useData<DashboardView>("dashboard/summary");
  return (
    <>
      <PageTitle
        eyebrow="MAKE YOUR NEXT MOVE"
        title="Your action center."
        description="Prepare a provider conversation and track the outcome."
      />
      <ErrorBox message={error} />
      {!data && !error ? (
        <Loading />
      ) : data?.actions.length ? (
        <div className="action-grid">
          {data.actions.map((a) => (
            <Link
              key={a.id}
              className="panel action-card"
              href={`/actions/${a.id}`}
            >
              <Badge tone={a.status === "SUCCESSFUL" ? "green" : "violet"}>
                {a.status.toLowerCase()}
              </Badge>
              <h2>{a.opportunity.title}</h2>
              <p>{a.opportunity.explanation}</p>
              {a.opportunity.analysis.status === "STALE" && (
                <p className="amber-text">
                  Based on a previous revision. Reanalyze the edited bill.
                </p>
              )}
              <span className="inline-link">
                View script & outcome <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      ) : !error ? (
        <Empty
          title="A plan starts with understanding."
          description="Analyze your bill, then choose a recommendation to create a personalized conversation script."
        />
      ) : null}
    </>
  );
}
