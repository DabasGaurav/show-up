import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isEnabled } from "@/lib/flags";
import { SiteHeader } from "./site-header";

const link = "flex min-h-11 items-center rounded-full px-3 font-semibold text-primary hover:bg-primary-soft";

/** Header with navigation for the current mode. Items outside the mode are not rendered. */
export async function AppHeader() {
  const user = await getUser();
  return (
    <SiteHeader>
      {isEnabled("F9") && <Link href="/feed" className={link}>Explore</Link>}
      {user?.role === "ngo_member" && <Link href="/ngo" className={link}>My NGO</Link>}
      {user ? <Link href="/me" className={link}>My plans</Link> : <Link href="/verify" className={link}>Sign in</Link>}
    </SiteHeader>
  );
}
