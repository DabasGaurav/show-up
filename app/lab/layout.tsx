import type { Metadata } from "next";
import Link from "next/link";
import { UnlockForm } from "@/app/admin/unlock-form";
import { Brand } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { isLabUnlocked } from "@/lib/auth";
import { requireFeature } from "@/lib/flags";
import { lockLabAction, unlockLabAction } from "./actions";

export const metadata: Metadata = { title: "Test Lab", robots: { index: false } };

// Test Lab (§9): prototype mode only, protected by a passcode.
export default async function LabLayout({ children }: LayoutProps<"/lab">) {
  requireFeature("LAB");
  if (!(await isLabUnlocked())) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <Brand />
        <h1 className="mt-6 text-2xl font-bold">Test Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">For facilitators running usability tests.</p>
        <div className="mt-6 rounded-xl border bg-card p-5">
          <UnlockForm action={unlockLabAction} label="Test Lab passcode" />
        </div>
      </main>
    );
  }
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <Brand />
            <Link href="/lab" className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white">Test Lab</Link>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="flex min-h-11 items-center rounded-lg px-2.5 font-medium hover:bg-muted">Admin</Link>
            <form action={lockLabAction}>
              <Button type="submit" variant="ghost" size="tap">Lock</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
