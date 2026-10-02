import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { rateNgoAction } from "@/app/actions/ratings";
import { AppHeader } from "@/components/app-header";
import { RatingForm } from "@/components/rating-form";
import { requireUser } from "@/lib/auth";
import { getBooking } from "@/lib/data/bookings";
import { RATING_TAGS } from "@/lib/data/org-profile";
import { requireFeature } from "@/lib/flags";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Rate this NGO" };

// Volunteer → NGO rating after an attended slot (F17).
export default async function RatePage(props: PageProps<"/me/rate/[id]">) {
  requireFeature("F17");
  const { id } = await props.params;
  const user = await requireUser(`/me/rate/${id}`);
  const b = await getBooking(id);
  if (!b || b.user_id !== user.id || b.status !== "attended") notFound();
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Link href="/me" className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">← My bookings</Link>
        <h1 className="text-2xl font-bold">How was {b.org_name}?</h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">{b.title} · {fmtDate(b.start_at)}. Your rating helps other volunteers trust this NGO.</p>
        <div className="rounded-xl border bg-card p-4">
          <RatingForm action={rateNgoAction} bookingId={b.id} tags={RATING_TAGS.volunteer} />
        </div>
      </main>
    </>
  );
}
