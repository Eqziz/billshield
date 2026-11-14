"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api, useData } from "@/lib/client";
import type { BillView, DashboardView } from "@/lib/types";
import { ErrorBox, Loading, PageTitle } from "./ui";
import { BillForm } from "./bill-form";
export function BillReview({ id }: { id: string }) {
  const { data, error } = useData<BillView>(`bills/${id}`);
  const { data: summary } = useData<DashboardView>("dashboard/summary");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  return (
    <>
      <PageTitle
        eyebrow="STEP 2 OF 3 · CHECK THE DETAILS"
        title="Your bill. Your final say."
        description="Make sure the numbers look right before we look for opportunities."
        action={
          <button
            className="button secondary danger"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} /> Delete bill
          </button>
        }
      />
      <ErrorBox message={error || deleteError} />
      {deleting && (
        <div className="notice amber">
          <p>
            Delete this bill, its analyses, action plans and associated
            outcomes? This cannot be undone.
          </p>
          <button
            className="button danger-button small"
            onClick={async () => {
              try {
                await api(`bills/${id}`, "DELETE");
                router.push("/bills");
              } catch (e) {
                setDeleteError((e as Error).message);
              }
            }}
          >
            Delete permanently
          </button>
          <button
            className="button ghost small"
            onClick={() => setDeleting(false)}
          >
            Keep bill
          </button>
        </div>
      )}
      {data ? (
        <BillForm bill={data} accounts={summary?.accounts || []} />
      ) : !error ? (
        <Loading />
      ) : null}
    </>
  );
}
