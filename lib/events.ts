import "server-only";
import { query } from "@/lib/db";

/** A light activity log (what was viewed, saved, freed, marked). Never throws. */
export async function track(name: string, props: Record<string, unknown> = {}, userId: string | null = null): Promise<void> {
  try {
    await query("insert into events (user_id, name, props) values ($1, $2, $3::jsonb)", [userId, name, JSON.stringify(props)]);
  } catch (e) {
    console.error("[show-up] track failed", name, e);
  }
}
