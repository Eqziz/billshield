"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, FileText, LockKeyhole } from "lucide-react";
import { initialize } from "@/lib/client";
import { ErrorBox, Logo, Submit } from "@/components/ui";
export default function Demo() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="onboarding">
      <Logo />
      <main id="main" className="welcome-card">
        <span className="large-icon">
          <ShieldCheck size={33} />
        </span>
        <p className="eyebrow">LET’S MAKE IT CLEAR</p>
        <h1>
          Your first step toward
          <br />a better-understood bill.
        </h1>
        <p>
          Start a private workspace. Bring your own bill or try a clearly
          labeled sample PDF through the same real analysis pipeline.
        </p>
        <div className="welcome-features">
          <span>
            <FileText /> Text-based internet PDFs, up to 10 MB
          </span>
          <span>
            <LockKeyhole /> Originals discarded after processing
          </span>
          <span>
            <ShieldCheck /> No signup. No provider credentials.
          </span>
        </div>
        <ErrorBox message={error} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await initialize();
              router.push("/bills/new");
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <Submit busy={busy}>
            Start my private workspace <ArrowRight size={17} />
          </Submit>
        </form>
        <small>
          Extracted data expires in 7 days. You can delete it sooner.
        </small>
        <Link href="/dashboard" className="inline-link">
          Return to my dashboard <ArrowRight size={15} />
        </Link>
      </main>
    </div>
  );
}
