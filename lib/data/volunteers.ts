import "server-only";
import { bookingFactsFor } from "@/lib/data/bookings";
import { query } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import {
  keptStreak, pausedUntil, progressToTrusted, reliabilityRecord, reliabilityString, trustLevel, verifiedHours,
  type BookingFact, type IdStatus, type ReliabilityRecord, type TrustLevel,
} from "@/lib/rules";

/** Everything shown about a volunteer on applicant cards, the turnout view and My profile. */
export interface VolunteerProfile {
  id: string;
  name: string;
  phone: string | null;
  idStatus: IdStatus;
  level: TrustLevel;
  record: ReliabilityRecord;
  recordString: string;
  streak: number;
  hours: number;
  hoursThisYear: number;
  progress: { attended: number; needed: number };
  pausedUntil: Date | null;
  memberSince: Date;
  /** Ratings given by NGOs (F17). */
  ratingAverage: number | null;
  ratingCount: number;
  ratingTags: { tag: string; count: number }[];
  facts: BookingFact[];
}

export async function volunteerProfiles(userIds: string[], now: Date): Promise<Map<string, VolunteerProfile>> {
  const ids = [...new Set(userIds)];
  const out = new Map<string, VolunteerProfile>();
  if (ids.length === 0) return out;

  const [users, facts, ratings] = await Promise.all([
    query<{ id: string; name: string; phone: string | null; id_status: IdStatus; created_at: Date }>(
      "select id, name, phone, id_status, created_at from users where id = any($1::uuid[])",
      [ids],
    ),
    bookingFactsFor(ids),
    isEnabled("F17")
      ? query<{ user_id: string; score: number; tags: string[] }>(
          `select b.user_id, r.score, r.tags from ratings r join bookings b on b.id = r.booking_id
           where r.rater_type = 'ngo' and b.user_id = any($1::uuid[])`,
          [ids],
        )
      : Promise.resolve([]),
  ]);

  for (const u of users) {
    const f = facts.get(u.id) ?? [];
    const mine = ratings.filter((r) => r.user_id === u.id);
    const tagCount = new Map<string, number>();
    for (const r of mine) for (const t of r.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const record = reliabilityRecord(f);
    out.set(u.id, {
      id: u.id,
      name: u.name,
      phone: u.phone,
      idStatus: u.id_status,
      level: isEnabled("F8") ? trustLevel(u.id_status, f, now) : "new",
      record,
      recordString: reliabilityString(record),
      streak: keptStreak(f),
      hours: verifiedHours(f),
      hoursThisYear: verifiedHours(f, now.getFullYear()),
      progress: progressToTrusted(f, now),
      pausedUntil: pausedUntil(f, now),
      memberSince: u.created_at,
      ratingAverage: mine.length ? Math.round((mine.reduce((a, r) => a + r.score, 0) / mine.length) * 10) / 10 : null,
      ratingCount: mine.length,
      ratingTags: [...tagCount].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
      facts: f,
    });
  }
  return out;
}

export async function volunteerProfile(userId: string, now: Date): Promise<VolunteerProfile | null> {
  return (await volunteerProfiles([userId], now)).get(userId) ?? null;
}

/** Keeps the stored `users.level` in step with the derived level (used by exports). */
export async function syncLevels(userIds: string[], now: Date): Promise<void> {
  if (!isEnabled("F8")) return;
  for (const p of (await volunteerProfiles(userIds, now)).values()) {
    await query("update users set level = $2 where id = $1 and level <> $2", [p.id, p.level]);
  }
}

// --- ID verification (F8, prototype: simulated) ---

export const ID_TYPES = ["Aadhaar", "PAN", "Driving licence", "Passport"] as const;

/** Prototype: no file is stored; submitting only moves the status to "Under review". */
export async function submitId(userId: string, idType: string): Promise<void> {
  await query("update users set id_status = 'pending' where id = $1 and id_status in ('none','rejected')", [userId]);
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [`id_type:${userId}`, JSON.stringify(idType)],
  );
}

export async function decideId(userId: string, approve: boolean, now: Date): Promise<void> {
  await query("update users set id_status = $2 where id = $1", [userId, approve ? "approved" : "rejected"]);
  await syncLevels([userId], now);
}

export async function listIdChecks(): Promise<{ id: string; name: string; phone: string | null; id_status: IdStatus; id_type: string | null }[]> {
  return query(
    `select u.id, u.name, u.phone, u.id_status,
            (select value #>> '{}' from app_state where key = 'id_type:' || u.id) as id_type
     from users u
     where u.id_status <> 'none'
     order by (u.id_status = 'pending') desc, u.created_at desc
     limit 100`,
  );
}
