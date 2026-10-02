import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { isMvp, isPrototype } from "@/lib/flags";
import { lockAdminAction, unlockAdminAction } from "./actions";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const tab = "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap hover:bg-muted";

// Team-only console (§6.3). Passcode or admin role required (§13).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <Brand />
        <h1 className="mt-6 text-2xl font-bold">Admin console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Team only.</p>
        <div className="mt-6 rounded-xl border bg-card p-5">
          <UnlockForm action={unlockAdminAction} label="Admin passcode" />
        </div>
      </main>
    );
  }
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white">Admin</span>
          </div>
          <form action={lockAdminAction}>
            <Button type="submit" variant="ghost" size="tap">
              Lock
            </Button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2" aria-label="Admin sections">
          <Link href="/admin" className={tab}>NGOs</Link>
          {isMvp && <Link href="/admin/reminders" className={tab}>Reminders</Link>}
          {isMvp && <Link href="/admin/released" className={tab}>Released slots</Link>}
          {isPrototype && <Link href="/admin/ids" className={tab}>ID checks</Link>}
          <Link href="/admin/metrics" className={tab}>Metrics</Link>
          <Link href="/admin/export" className={tab}>Export</Link>
          {isPrototype && <Link href="/lab" className={tab}>Test Lab</Link>}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
