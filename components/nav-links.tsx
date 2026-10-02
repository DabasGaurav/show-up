"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";

const link = "flex min-h-11 items-center rounded-full px-2.5 font-semibold whitespace-nowrap text-primary hover:bg-primary-soft sm:px-3";

/** Header links. On the NGO side the first link flips to "For volunteers". */
export function NavLinks({ signedIn, isNgo }: { signedIn: boolean; isNgo: boolean }) {
  const pathname = usePathname();
  const ngoSide = pathname.startsWith("/for-ngos") || pathname.startsWith("/dashboard");
  return (
    <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
      {ngoSide ? <Link href="/" className={link}>For volunteers</Link>
        : isNgo ? <Link href="/dashboard" className={link}>Dashboard</Link>
        : <Link href="/for-ngos" className={link}>For NGOs</Link>}
      {signedIn ? (
        <>
          <Link href="/me" className={link}>My plans</Link>
          <Link href="/account" aria-label="My account" className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary hover:bg-primary hover:text-white">
            <UserRound className="size-5" aria-hidden />
          </Link>
        </>
      ) : (
        <Link href={ngoSide ? "/signin?next=/dashboard" : "/signin"} className="flex min-h-11 items-center rounded-full bg-primary px-4 font-semibold whitespace-nowrap text-white hover:bg-primary/90">
          Sign in / up
        </Link>
      )}
    </nav>
  );
}
