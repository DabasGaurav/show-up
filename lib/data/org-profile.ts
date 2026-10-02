import "server-only";
import { query, queryOne } from "@/lib/db";
import { displayRating, responseRate } from "@/lib/rules";

/** Verified NGO profile (F10, §5.10). */
export interface OrgProfile {
  id: string;
  name: string;
  city: string;
  causes: string[];
  about: string | null;
  photos: string[];
  verified: boolean;
  pastVolunteers: number;
  /** Shown only after ≥3 reviews. */
  rating: { average: number; count: number } | null;
  latestReviews: { score: number; tags: string[]; by: string; at: Date }[];
  /** % of requests answered within 48h over the last 90 days; null with no history. */
  responseRate: number | null;
}

export async function orgProfile(orgId: string, now: Date): Promise<OrgProfile | null> {
  const org = await queryOne<{ id: string; name: string; city: string; causes: string[]; about: string | null; photos: string[]; verified_at: Date | null }>(
    "select id, name, city, causes, about, photos, verified_at from organisations where id = $1",
    [orgId],
  );
  if (!org) return null;
  const [past, reviews, requests] = await Promise.all([
    queryOne<{ n: number }>(
      `select count(distinct b.user_id)::int as n from bookings b
       join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
       where t.org_id = $1 and b.status = 'attended'`,
      [orgId],
    ),
    query<{ score: number; tags: string[]; name: string; created_at: Date }>(
      `select r.score, r.tags, u.name, r.created_at from ratings r
       join bookings b on b.id = r.booking_id join users u on u.id = b.user_id
       join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
       where t.org_id = $1 and r.rater_type = 'volunteer'
       order by r.created_at desc`,
      [orgId],
    ),
    query<{ created_at: Date; decided_at: Date | null }>(
      `select b.created_at, b.decided_at from bookings b
       join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
       where t.org_id = $1 and t.booking_mode = 'approval' and b.source <> 'standby'
         and (b.decided_at is not null or b.status in ('requested','auto_released'))`,
      [orgId],
    ),
  ]);
  return {
    id: org.id,
    name: org.name,
    city: org.city,
    causes: org.causes,
    about: org.about,
    photos: org.photos,
    verified: org.verified_at !== null,
    pastVolunteers: past?.n ?? 0,
    rating: displayRating(reviews.map((r) => r.score)),
    latestReviews: reviews.slice(0, 2).map((r) => ({ score: r.score, tags: r.tags, by: r.name.split(" ")[0], at: r.created_at })),
    responseRate: responseRate(requests.map((r) => ({ createdAt: r.created_at, decidedAt: r.decided_at })), now),
  };
}

// --- Two-way ratings (F17, §5.11) ---

export const RATING_TAGS = {
  ngo: ["On time", "Prepared", "Would invite again"], // NGO → volunteer
  volunteer: ["Well organised", "Clear brief", "Felt welcome"], // volunteer → NGO
} as const;

export async function saveRating(bookingId: string, raterType: "ngo" | "volunteer", score: number, tags: string[]): Promise<void> {
  const allowed = RATING_TAGS[raterType] as readonly string[];
  await query(
    `insert into ratings (booking_id, rater_type, score, tags) values ($1, $2, $3, $4)
     on conflict (booking_id, rater_type) do update set score = excluded.score, tags = excluded.tags`,
    [bookingId, raterType, Math.min(5, Math.max(1, Math.round(score))), tags.filter((t) => allowed.includes(t))],
  );
}

export async function ratedBookingIds(bookingIds: string[], raterType: "ngo" | "volunteer"): Promise<Set<string>> {
  if (bookingIds.length === 0) return new Set();
  const rows = await query<{ booking_id: string }>(
    "select booking_id from ratings where rater_type = $2 and booking_id = any($1::uuid[])",
    [bookingIds, raterType],
  );
  return new Set(rows.map((r) => r.booking_id));
}
