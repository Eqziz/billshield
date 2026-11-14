"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Plus,
  ArrowUpRight,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./ui";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">
          YOUR WORKSPACE <span className="live-dot" />
        </div>
        <nav aria-label="Workspace">
          <Link
            className={path === "/dashboard" ? "active" : ""}
            href="/dashboard"
          >
            <LayoutDashboard size={19} />
            Overview
          </Link>
          <Link
            className={
              path.startsWith("/bills") || path.startsWith("/analysis")
                ? "active"
                : ""
            }
            href="/bills"
          >
            <FileText size={19} />
            My bills
          </Link>
          <Link
            className={path.startsWith("/actions") ? "active" : ""}
            href="/actions"
          >
            <ShieldCheck size={19} />
            Action center
          </Link>
          <Link
            className={path === "/settings" ? "active" : ""}
            href="/settings"
          >
            <Settings size={19} />
            Privacy & settings
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <LockKeyhole size={20} />
            <strong>A private space for your bills</strong>
            <p>
              Guest data expires after 7 days. Your original PDF is never
              retained.
            </p>
          </div>
          <Link href="/pricing" className="sidebar-plan">
            Explore BillShield Plus <ArrowUpRight size={16} />
          </Link>
          <div className="guest-avatar">
            <span>G</span>
            <div>
              <strong>Guest workspace</strong>
              <small>No account needed</small>
            </div>
            <span className="guest-dot" />
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="slash">/</span>
            <strong>
              {path === "/dashboard"
                ? "Overview"
                : path.includes("new")
                  ? "New analysis"
                  : path.includes("analysis")
                    ? "Bill analysis"
                    : path.includes("actions")
                      ? "Action center"
                      : path.includes("settings")
                        ? "Privacy & settings"
                        : "My bills"}
            </strong>
          </div>
          <div className="header-actions">
            <span className="guest-tag">
              <span className="live-dot" />
              Private guest session
            </span>
            <Link href="/bills/new" className="button small primary">
              <Plus size={16} /> Add bill
            </Link>
          </div>
        </header>
        <main id="main" className="app-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>Clarity first. Savings you can verify.</span>
          <Link href="/settings">
            <LockKeyhole size={12} /> Your data, your control
          </Link>
        </footer>
      </div>
    </div>
  );
}
