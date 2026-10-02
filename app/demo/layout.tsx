import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/site-header";

export const metadata: Metadata = { title: { default: "Demo", template: "%s · Show-Up demo" }, robots: { index: false } };

// Demo mode (brief, Part C): sample data from a local file, nothing is saved.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <header>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <Link href="/demo" className="flex min-h-11 items-center" aria-label="Demo: sample data, nothing is saved">
            <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-ink">Demo</span>
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
