import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Link2, UsersRound } from "lucide-react";
import { HeroPeeps } from "@/components/art";
import { Header } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "For NGOs" };

const POINTS = [
  { icon: <Link2 />, text: "Post an activity and share one link" },
  { icon: <UsersRound />, text: "See who's coming before the day" },
  { icon: <BellRing />, text: "Reminders go out for you" },
];

// For NGOs: why, and the way in to sign-up.
export default async function ForNgos() {
  const user = await getUser();
  if (user && (await getOrgForUser(user.id))) redirect("/dashboard");
  return (
    <>
      <Header />
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-8 px-4 py-4 sm:grid-cols-2 sm:py-10">
        <div>
          <h1 className="hero-title text-balance">Spend your time on the cause, not on chasing people.</h1>
          <ul className="mt-5 space-y-3">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 font-medium">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary [&>svg]:size-5" aria-hidden>{p.icon}</span>
                {p.text}
              </li>
            ))}
          </ul>
          <HeroPeeps className="mt-8 hidden max-w-xs sm:grid" />
        </div>
        <div className="rounded-xl bg-card p-5 text-center">
          <h2 className="text-2xl">It&apos;s free, and takes two minutes.</h2>
          <p className="mt-2 text-ink-soft">Tell us about you and your NGO. We call you within a day.</p>
          <Link href="/for-ngos/signup" className={cn(buttonVariants({ size: "tap" }), "mt-5 h-14 w-full text-lg")}>Sign up your NGO</Link>
          {!user && <p className="mt-4">Already signed up? <Link href="/signin?next=/dashboard" className="font-semibold text-primary underline underline-offset-2">Sign in</Link></p>}
        </div>
      </main>
    </>
  );
}
