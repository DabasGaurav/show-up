import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { S } from "@/lib/strings";

export function Brand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold text-brand">
      <ShieldCheck className="size-6" aria-hidden />
      <span className="text-lg tracking-tight">{S.brand}</span>
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <Brand />
        <nav className="flex items-center gap-1 text-sm">{children}</nav>
      </div>
    </header>
  );
}
