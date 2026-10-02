import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isEnabled } from "@/lib/flags";
import { S } from "@/lib/strings";
import { SiteHeader } from "./site-header";

const link = "flex min-h-11 items-center rounded-lg px-2.5 font-medium text-foreground/80 hover:bg-muted hover:text-foreground";

/** Header with navigation for the current mode. Items outside the mode are not rendered (§0.2). */
export async function AppHeader() {
  const user = await getUser();
  return (
    <SiteHeader>
      {isEnabled("F9") && (
        <Link href="/feed" className={link}>
          {S.nav.feed}
        </Link>
      )}
      {user?.role === "ngo_member" && (
        <Link href="/ngo" className={link}>
          NGO
        </Link>
      )}
      {user ? (
        <Link href="/me" className={link}>
          {S.nav.myBookings}
        </Link>
      ) : (
        <Link href="/verify" className={link}>
          Sign in
        </Link>
      )}
    </SiteHeader>
  );
}
