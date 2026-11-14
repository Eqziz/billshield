"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Trash2, ShieldCheck, RotateCcw } from "lucide-react";
import { api, initialize, resetSession, useData } from "@/lib/client";
import { ErrorBox, PageTitle, Badge } from "@/components/ui";
export default function Settings() {
  const { data, error } = useData<{ expiresAt: string }>("demo/session");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function remove(fresh: boolean) {
    setBusy(true);
    try {
      await api("privacy/workspace", "DELETE");
      resetSession();
      if (fresh) {
        await initialize();
        router.push("/dashboard");
      } else router.push("/?deleted=1");
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR DATA, YOUR CONTROL"
        title="A private space. On your terms."
        description="See what we store and decide when it goes."
      />
      <ErrorBox message={error || message} />
      <div className="settings-grid">
        <section className="panel form-panel">
          <span className="icon-tile">
            <LockKeyhole size={24} />
          </span>
          <h2>Your guest workspace</h2>
          <Badge tone="green">Isolated & private</Badge>
          <p>
            No registration or provider credentials are required. Access is
            protected by a server-generated session cookie. Guest workspaces
            expire 7 days after creation.
          </p>
          {data && (
            <div className="setting-detail">
              <span>Workspace expires</span>
              <strong>
                {new Date(data.expiresAt).toLocaleString("en-US")}
              </strong>
            </div>
          )}
          <div className="setting-detail">
            <span>Original PDF retention</span>
            <strong>Not retained</strong>
          </div>
          <div className="setting-detail">
            <span>Stored information</span>
            <strong>Reviewed bill data & outcomes</strong>
          </div>
          <p className="tiny">
            We also store document metadata, minimal audit events and anonymous
            quota counters. Expired guest data is removed by scheduled cleanup
            and when new sessions are created. An expired session cannot access
            its records.
          </p>
        </section>
        <section className="panel form-panel">
          <span className="icon-tile">
            <ShieldCheck size={24} />
          </span>
          <h2>How processing works</h2>
          <p>
            PDFs are parsed on the server. Extracted amounts and line-item
            evidence stay in your workspace so you can review them and
            understand recommendations.
          </p>
          <p>
            Core extraction, rules, calculations and scripts do not require AI.
            If the operator configures optional AI extraction, document text may
            be sent to OpenAI. Common account numbers, emails and phone numbers
            are redacted; other personal content may remain. Use manual entry if
            you prefer to avoid document processing.
          </p>
          <p className="tiny">
            Do not upload passwords, identity documents, bank statements or
            documents unrelated to internet service. This release does not
            provide financial or legal advice.
          </p>
        </section>
      </div>
      <section className="panel danger-zone">
        <div>
          <p className="eyebrow">FRESH START</p>
          <h2>Delete your workspace</h2>
          <p>
            This removes all bills, extracted evidence, analyses, scripts and
            recorded outcomes in this guest workspace.
          </p>
        </div>
        {confirm ? (
          <div className="deletion-confirm">
            <strong>This permanently deletes your guest data.</strong>
            <div>
              <button
                disabled={busy}
                className="button danger-button"
                onClick={() => remove(false)}
              >
                Delete all my data
              </button>
              <button
                disabled={busy}
                className="button secondary"
                onClick={() => remove(true)}
              >
                <RotateCcw size={16} /> Delete & start fresh
              </button>
              <button
                className="button ghost"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="button secondary danger"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={16} /> Delete workspace
          </button>
        )}
      </section>
    </>
  );
}
