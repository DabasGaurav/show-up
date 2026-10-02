import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Flame } from "lucide-react";
import { saveProfileAction } from "@/app/actions/volunteer";
import { AppHeader } from "@/components/app-header";
import { Chip, LevelBadge } from "@/components/badges";
import { ChipChecks, Field, Select } from "@/components/forms/field";
import { LevelsCard } from "@/components/levels-card";
import { Stars } from "@/components/stars";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listBookingsForUser } from "@/lib/data/bookings";
import { volunteerProfile } from "@/lib/data/volunteers";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { requireFeature } from "@/lib/flags";
import { fmtDate, fmtDuration } from "@/lib/format";
import { S } from "@/lib/strings";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My profile" };

// Screen 5: My profile — reliability level, streak, verified hours (F6, F16).
export default async function ProfilePage(props: PageProps<"/me/profile">) {
  requireFeature("F16");
  const user = await requireUser("/me/profile");
  const { saved } = await props.searchParams;
  const at = await tick();
  const [p, bookings] = await Promise.all([volunteerProfile(user.id, at), listBookingsForUser(user.id)]);
  if (!p) return null;
  const attended = bookings.filter((b) => b.status === "attended");
  const next =
    p.level === "new"
      ? user.id_status === "pending" ? "Your ID is under review." : "Get your ID checked to become Verified."
      : p.level === "verified"
        ? `${p.progress.attended} of ${p.progress.needed} attended slots to Trusted`
        : "You're at the top level. Keep showing up.";
  const pct = p.level === "trusted" ? 100 : p.level === "verified" ? Math.round((p.progress.attended / p.progress.needed) * 100) : 0;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-6">
        <Link href="/me" className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">← My bookings</Link>
        {saved && <p role="status" className="rounded-lg bg-ok-soft px-4 py-3 text-sm font-medium text-ok">Saved.</p>}

        <section className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <LevelBadge level={p.level} />
          </div>
          <p className="mt-3 text-sm font-medium">{next}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next level">
            <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
          </div>
          {p.level === "new" && user.id_status !== "pending" && (
            <Link href="/verify/id?next=/me/profile" className={cn(buttonVariants({ size: "tap" }), "mt-3 w-full")}>Get Verified</Link>
          )}
          {p.pausedUntil && (
            <p className="mt-3 rounded-lg bg-gap-soft px-3 py-2 text-sm text-gap">
              <strong>Paused until {fmtDate(p.pausedUntil)}.</strong> {S.rules.consequence}
            </p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Reliability record</h2>
          <p className="mt-1 text-sm">{p.recordString}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Flame className="size-4 text-warn" aria-hidden />Streak</dt>
              <dd className="mt-1 text-sm font-semibold">{p.streak} {p.streak === 1 ? "commitment" : "commitments"} kept in a row</dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-4 text-brand" aria-hidden />Verified hours</dt>
              <dd className="mt-1 text-sm font-semibold">{p.hours} total · {p.hoursThisYear} this year</dd>
            </div>
          </dl>
          {attended.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-medium">Past slots</h3>
              <ul className="mt-1 divide-y text-sm">
                {attended.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{b.title}</span>
                      <span className="text-xs text-muted-foreground">{b.org_name} · {fmtDate(b.start_at)}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{fmtDuration(b.duration_min)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Ratings received</h2>
          {p.ratingCount === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No ratings yet. NGOs can rate you after a slot.</p>
          ) : (
            <>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                <Stars score={p.ratingAverage ?? 0} /> {p.ratingAverage?.toFixed(1)}
                <span className="font-normal text-muted-foreground">from {p.ratingCount} {p.ratingCount === 1 ? "NGO rating" : "NGO ratings"}</span>
              </p>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {p.ratingTags.map((t) => <Chip key={t.tag} tone="blue">{t.tag} ×{t.count}</Chip>)}
              </p>
            </>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Saved causes and city</h2>
          <p className="mt-1 text-sm text-muted-foreground">We use these to suggest tasks. Moved city? Update it here.</p>
          <form action={saveProfileAction} className="mt-3 space-y-4">
            <Field label="City" htmlFor="city">
              <Select id="city" name="city" defaultValue={user.city ?? CITY_NAMES[0]}>
                {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Causes">
              <ChipChecks name="causes" options={CAUSES} defaultValues={user.saved_causes} />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="is_online_ok" defaultChecked={user.is_online_ok} className="size-5 accent-[#1f3864]" />
              Also show me online tasks
            </label>
            <Button type="submit" size="tap" className="w-full">Save</Button>
          </form>
        </section>

        <LevelsCard />
      </main>
    </>
  );
}
