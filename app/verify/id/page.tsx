import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Chip, LevelBadge } from "@/components/badges";
import { LevelsCard } from "@/components/levels-card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser, safeNext } from "@/lib/auth";
import { now } from "@/lib/clock";
import { ID_TYPES, volunteerProfile } from "@/lib/data/volunteers";
import { requireFeature } from "@/lib/flags";
import { cn } from "@/lib/utils";
import { IdForm } from "./id-form";

export const metadata: Metadata = { title: "Get Verified" };

// Screen 1, Step B: ID check (F8, prototype only: simulated).
export default async function VerifyIdPage(props: PageProps<"/verify/id">) {
  requireFeature("F8");
  const { next } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  const user = await requireUser(`/verify/id?next=${encodeURIComponent(target)}`);
  const profile = await volunteerProfile(user.id, await now());

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-8">
        <div>
          <p className="text-sm font-medium text-brand">Verify once · step 2 of 2</p>
          <h1 className="mt-1 text-2xl font-bold">Get Verified to book Verified-only tasks</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Your level now: <LevelBadge level={profile?.level ?? "new"} />
          </p>
        </div>

        {user.id_status === "approved" ? (
          <section role="status" className="rounded-xl bg-ok-soft p-5 text-sm text-ok">
            <p className="font-semibold">Your ID is checked. You&apos;re Verified.</p>
            <p className="mt-1">Attend 3 slots with no no-shows to become Trusted.</p>
          </section>
        ) : user.id_status === "pending" ? (
          <section role="status" className="rounded-xl border bg-card p-5 text-sm">
            <Chip tone="amber">Under review</Chip>
            <p className="mt-2">We&apos;re checking your ID. You can keep booking tasks open to everyone while you wait.</p>
          </section>
        ) : (
          <section className="rounded-xl border bg-card p-5">
            {user.id_status === "rejected" && (
              <p role="alert" className="mb-4 rounded-lg bg-gap-soft px-3 py-2 text-sm font-medium text-gap">
                We couldn&apos;t check that ID. Please try again with a clearer photo.
              </p>
            )}
            <IdForm next={target} idTypes={ID_TYPES} />
          </section>
        )}

        <Link href={target} className={cn(buttonVariants({ size: "tap", variant: user.id_status === "none" ? "ghost" : "default" }), "w-full")}>
          {user.id_status === "none" || user.id_status === "rejected" ? "Skip for now" : "Continue"}
        </Link>

        <LevelsCard />
      </main>
    </>
  );
}
