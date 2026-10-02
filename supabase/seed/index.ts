import type { Db } from "@/lib/db";

// Prototype sample data (PRD §11). All NGOs, people and places are fictional.
// Filled in as each milestone lands; finalised in Milestone 9.
export async function seed(db: Db): Promise<void> {
  await db.query(
    "insert into app_state (key, value) values ('seeded_at', to_jsonb(now())) on conflict (key) do nothing",
  );
}
