import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Show-Up home">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="font-heading text-xl font-bold tracking-tight text-ink">Show-Up</span>
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Brand />
        <nav className="flex items-center gap-1 text-sm">{children}</nav>
      </div>
    </header>
  );
}
