"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`logo ${light ? "light" : ""}`}
      aria-label="BillShield home"
    >
      <span className="logo-icon">
        <ShieldCheck size={23} />
      </span>
      BillShield<span className="logo-dot">.</span>
    </Link>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>Opening your private workspace…</span>
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
  green = false,
}: {
  label: string;
  value: string;
  note: string;
  green?: boolean;
}) {
  return (
    <div className={`stat ${green ? "stat-green" : ""}`}>
      <span>
        {label}
        <ArrowUpRight size={16} />
      </span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <ShieldCheck size={30} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href="/bills/new" className="button primary">
        Analyze your first bill <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "violet";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="button primary" disabled={busy} type="submit">
      {busy ? (
        <>
          <LoaderCircle className="spin" size={16} /> Working…
        </>
      ) : (
        children
      )}
    </button>
  );
}
