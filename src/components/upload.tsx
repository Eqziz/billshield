"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  ArrowRight,
  LockKeyhole,
  LoaderCircle,
  Download,
  PenLine,
} from "lucide-react";
import { api, initialize, useData } from "@/lib/client";
import type { DashboardView } from "@/lib/types";
import { ErrorBox, PageTitle } from "./ui";
import { BillForm } from "./bill-form";
export function UploadBill() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [manual, setManual] = useState(false);
  const [accountId, setAccountId] = useState("");
  const { data } = useData<DashboardView>("dashboard/summary");
  async function upload(file: File) {
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a PDF smaller than 10 MB.");
      return;
    }
    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Choose a PDF document. Other file types are not supported.");
      return;
    }
    setBusy("Reading your PDF and finding the bill details…");
    const feedback = setTimeout(
      () =>
        setBusy(
          "Recognizing text and images in your PDF. Scanned pages can take up to 90 seconds…",
        ),
      4000,
    );
    try {
      await initialize();
      const form = new FormData();
      form.append("file", file);
      if (accountId) form.append("serviceAccountId", accountId);
      const result = await api<{ bill: { id: string } }>(
        "uploads",
        "POST",
        form,
      );
      router.push(`/bills/${result.bill.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    } finally {
      clearTimeout(feedback);
    }
  }
  async function sample(name: string) {
    setBusy("Opening the sample PDF…");
    try {
      const response = await fetch(`/fixtures/${name}.pdf`);
      if (!response.ok) throw new Error("Sample PDF could not be loaded.");
      await upload(
        new File([await response.blob()], `${name}.pdf`, {
          type: "application/pdf",
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="STEP 1 OF 3 · BRING YOUR BILL"
        title="Let’s take a closer look."
        description="Upload your internet bill. We’ll find the details, and you’ll review every number."
      />
      <div className="upload-layout">
        <section>
          <ErrorBox message={error} />
          {manual ? (
            <BillForm
              accounts={data?.accounts || []}
              onCancel={() => setManual(false)}
            />
          ) : (
            <>
              <div className="panel upload-panel">
                <div className="upload-panel-title">
                  <span className="icon-tile">
                    <FileText size={21} />
                  </span>
                  <div>
                    <h2>Your internet statement</h2>
                    <p>U.S. residential internet · PDF documents</p>
                  </div>
                </div>
                {data?.accounts.length ? (
                  <label className="field">
                    Service account
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">Create a new service account</option>
                      {data.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.providerName} · {a.displayName}
                        </option>
                      ))}
                    </select>
                    <small>
                      Select the same account for a second bill to compare
                      costs.
                    </small>
                  </label>
                ) : null}
                <div
                  role="button"
                  tabIndex={busy ? -1 : 0}
                  aria-label="Choose a PDF bill to upload"
                  aria-disabled={!!busy}
                  className={`dropzone ${drag ? "dragging" : ""} ${busy ? "processing" : ""}`}
                  onClick={() => !busy && fileInput.current?.click()}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !busy) {
                      e.preventDefault();
                      fileInput.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    if (!busy && e.dataTransfer.files[0])
                      void upload(e.dataTransfer.files[0]);
                  }}
                >
                  {busy ? (
                    <LoaderCircle size={36} className="spin" />
                  ) : (
                    <UploadCloud size={38} />
                  )}
                  <h3>
                    {busy
                      ? "Making sense of your bill…"
                      : "Drop your PDF right here"}
                  </h3>
                  <p>{busy ? busy : "or click to browse your files"}</p>
                  {!busy && (
                    <span className="button primary small">
                      Choose PDF <ArrowRight size={16} />
                    </span>
                  )}
                  <small>
                    {busy
                      ? "Your original document will not be stored."
                      : "PDF only · Up to 10 MB · Up to 20 pages"}
                  </small>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  hidden
                  disabled={!!busy}
                  onChange={(e) => {
                    if (e.target.files?.[0]) void upload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <p className="upload-privacy">
                  <LockKeyhole size={16} /> Processed privately. Your original
                  PDF is discarded after extraction.
                </p>
              </div>
              <button
                className="manual-entry"
                disabled={!!busy}
                onClick={() => setManual(true)}
              >
                <PenLine size={18} />
                <div>
                  <strong>Prefer to enter the details yourself?</strong>
                  <small>Also works for scanned or unreadable bills.</small>
                </div>
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </section>
        <aside className="upload-aside">
          <div className="aside-tip">
            <span className="eyebrow">NO BILL HANDY?</span>
            <h2>Give clarity a test run.</h2>
            <p>
              Try a fictional statement through the real PDF extraction
              pipeline. Sample data is always labeled.
            </p>
            <button
              className="sample-button"
              disabled={!!busy}
              onClick={() => sample("internet-rental")}
            >
              <span className="sample-icon">
                <FileText size={20} />
              </span>
              <div>
                <strong>Equipment rental</strong>
                <small>Synthetic PDF · October statement</small>
              </div>
              <ArrowRight size={16} />
            </button>
            <button
              className="sample-button"
              disabled={!!busy}
              onClick={() => sample("internet-increase")}
            >
              <span className="sample-icon">
                <FileText size={20} />
              </span>
              <div>
                <strong>A higher next bill</strong>
                <small>Synthetic PDF · November statement</small>
              </div>
              <ArrowRight size={16} />
            </button>
            <button
              className="sample-button"
              disabled={!!busy}
              onClick={() => sample("internet-addon")}
            >
              <span className="sample-icon">
                <FileText size={20} />
              </span>
              <div>
                <strong>An optional add-on</strong>
                <small>Synthetic PDF · Separate provider</small>
              </div>
              <ArrowRight size={16} />
            </button>
            <a
              className="inline-link"
              href="/fixtures/internet-rental.pdf"
              download
            >
              <Download size={14} /> Download sample PDF
            </a>
          </div>
          <div className="aside-tip plain">
            <h3>What happens next?</h3>
            <ol>
              <li>
                <span>1</span> We extract what the document says.
              </li>
              <li>
                <span>2</span> You review and correct the details.
              </li>
              <li>
                <span>3</span> Get evidence-based next steps.
              </li>
            </ol>
            <p className="tiny">
              English image text is recognized with OCR on up to 5 pages. Review
              every amount; unreadable details can be entered manually.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
