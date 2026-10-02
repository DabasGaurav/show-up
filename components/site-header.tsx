import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { ViewAsBar } from "@/components/view-as-bar";
import { getUser } from "@/lib/auth";

export function Brand() {
  return (
    <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2" aria-label="Show-Up home">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
      <span className="font-heading text-xl font-bold tracking-tight whitespace-nowrap text-ink">Show-Up</span>
    </Link>
  );
}

export async function Header() {
  const user = await getUser();
  return (
    <header>
      <ViewAsBar />
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Brand />
        <NavLinks signedIn={Boolean(user)} isNgo={user?.role === "ngo_member"} />
      </div>
    </header>
  );
}
