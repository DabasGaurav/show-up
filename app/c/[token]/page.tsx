import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { OnePeep } from "@/components/art";
import { DateBlock, Pill } from "@/components/kit";
import { Brand } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { getSpotByToken } from "@/lib/data/bookings";
import { dateBlock, fmtDayTime, fmtTimeRange, fmtWeekday } from "@/lib/format";
import { volunteerPill } from "@/lib/labels";
import { ACTIVE, freeBy } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { CheckIn } from "./panel";

export const metadata: Metadata = { title: "Still on?", robots: { index: false } };

// Check-in page, opened from the email.
export default async function CheckInPage(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const { cant } = await props.searchParams;
  const at = await tick();
  const s = await getSpotByToken(token);
  if (!s) notFound();

  // This page only reads the link's token. It never signs anyone in or out.
  const viewer = await getUser();
  const mine = viewer?.id === s.user_id;
  const first = s.user_name.split(" ")[0];
  const pill = volunteerPill(s.status);
  const open = ACTIVE.includes(s.status) && at.getTime() < s.start_at.getTime();
  const freed = s.status === "released_early" || s.status === "released_late";
  const free = freeBy(s.start_at);
  const onTime = at.getTime() <= free.getTime();
  const heading = freed
    ? "Done. Your spot is open for someone else."
    : !open
      ? s.status === "attended" ? "Thank you for showing up." : "This one's already happened."
      : s.status === "confirmed" ? "Lovely. See you there." : `Still on for ${fmtWeekday(s.start_at)}?`;

  return (
    <>
      <header>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Brand />
          {mine && <Link href="/me" prefetch={false} className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary hover:bg-primary-soft">My plans</Link>}
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 lg:py-10">
        {viewer && !mine && (
          <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium">
            This is {first}&apos;s spot. You&apos;re still signed in as {viewer.name}.
          </p>
        )}
        <p className="mb-1 font-semibold text-ink-soft">Hi {first},</p>
        <h1 className="text-4xl leading-10 text-balance">{heading}</h1>
        {open && s.status === "confirmed" && <p className="mt-2 text-ink-soft">We&apos;ll email the details on the morning.</p>}
        {freed && <p className="mt-2 text-ink-soft">Thanks for telling {s.org_name}.</p>}

        <section className="mt-5 flex gap-3.5 rounded-xl bg-card p-4">
          <DateBlock {...dateBlock(s.start_at)} className="self-start" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg leading-6">{s.title}</h2>
              <Pill tone={pill.tone}>{pill.label}</Pill>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{s.org_name}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm"><Clock className="size-4 text-primary" aria-hidden />{fmtTimeRange(s.start_at, s.end_at)}</p>
            <p className="flex items-center gap-1.5 text-sm"><MapPin className="size-4 shrink-0 text-primary" aria-hidden /><span className="truncate">{s.mode === "online" ? "Online" : [s.address, s.city].filter(Boolean).join(", ")}</span></p>
          </div>
        </section>

        {open ? (
          <section className="mt-5">
            <CheckIn token={s.confirm_token} canSayYes={s.status !== "confirmed"} late={!onTime} startOpen={cant === "1"} />
            {onTime && <p className="mt-3 text-center text-sm text-ink-soft">Plans change? Free up your spot by {fmtDayTime(free)}, no questions asked.</p>}
          </section>
        ) : (
          <section className="mt-6 text-center">
            <OnePeep index={freed ? 1 : 4} />
            {s.status === "no_show" && <p className="mt-2 text-ink-soft">{s.org_name} marked that you didn&apos;t come.</p>}
            <Link href={freed || !mine ? "/" : "/me"} prefetch={false} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-4")}>{freed ? "Find something else" : mine ? "See my plans" : "See what's on"}</Link>
          </section>
        )}
      </main>
    </>
  );
}
