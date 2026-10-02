import { rateVolunteerAction } from "@/app/actions/ratings";
import { RatingForm } from "@/components/rating-form";
import { listBookingsForOccurrence } from "@/lib/data/bookings";
import { RATING_TAGS, ratedBookingIds } from "@/lib/data/org-profile";
import { isEnabled } from "@/lib/flags";
import { shortName } from "@/lib/format";
import { StandbyCoverPanel } from "./standby-panel";

// Prototype-only panels on the turnout view: Standby cover log (F11) and NGO → volunteer
// ratings (F17). Renders nothing in MVP1.
export async function TurnoutExtras({ occurrenceId }: { occurrenceId: string; taskId: string; now: Date }) {
  const attended = isEnabled("F17") ? (await listBookingsForOccurrence(occurrenceId)).filter((b) => b.status === "attended") : [];
  const rated = await ratedBookingIds(attended.map((b) => b.id), "ngo");
  const toRate = attended.filter((b) => !rated.has(b.id));
  return (
    <>
      {isEnabled("F11") && <StandbyCoverPanel occurrenceId={occurrenceId} />}
      {toRate.length > 0 && (
        <section className="mt-6 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Rate your volunteers</h2>
          <p className="mt-1 text-sm text-muted-foreground">Other NGOs see these ratings on applicant profiles.</p>
          <ul className="mt-3 divide-y">
            {toRate.map((b) => (
              <li key={b.id} className="py-3">
                <p className="mb-2 font-medium">{shortName(b.user_name)}</p>
                <RatingForm action={rateVolunteerAction} bookingId={b.id} tags={RATING_TAGS.ngo} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
