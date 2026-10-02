import Link from "next/link";
import { Building2, CalendarCheck, Check, HandHeart } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { isEnabled } from "@/lib/flags";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";

const L = S.landing;

function Points({ title, points, icon }: { title: string; points: readonly string[]; icon: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-brand">
        {icon}
        {title}
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function LandingPage() {
  const hasFeed = isEnabled("F9");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        <section className="py-10 sm:py-16">
          <p className="text-sm font-medium text-brand">{L.eyebrow}</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {L.title}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">{S.pitch}</p>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">{L.lead}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/ngo" className={cn(buttonVariants({ size: "tap" }), "sm:min-w-48")}>
              <Building2 aria-hidden />
              {L.ngoCta}
            </Link>
            <Link
              href={hasFeed ? "/feed" : "#volunteer"}
              className={cn(buttonVariants({ size: "tap", variant: "outline" }), "sm:min-w-48")}
            >
              <HandHeart aria-hidden />
              {L.volunteerCta}
            </Link>
          </div>
        </section>

        {!hasFeed && (
          <section id="volunteer" className="mb-6 scroll-mt-4 rounded-xl border border-brand/20 bg-info-soft p-5">
            <h2 className="text-base font-semibold text-brand">{L.mvpVolunteerTitle}</h2>
            <p className="mt-1 text-sm">{L.mvpVolunteerBody}</p>
            <Link href="/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-3 bg-card")}>
              <CalendarCheck aria-hidden />
              {L.myBookings}
            </Link>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Points title={L.ngoTitle} points={L.ngoPoints} icon={<Building2 className="size-5" aria-hidden />} />
          <Points
            title={L.volunteerTitle}
            points={L.volunteerPoints}
            icon={<HandHeart className="size-5" aria-hidden />}
          />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">{L.howTitle}</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {L.steps.map((s, i) => (
              <li key={s.title} className="rounded-xl border bg-card p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">{S.rules.release}</p>
        </section>
      </main>
    </>
  );
}
