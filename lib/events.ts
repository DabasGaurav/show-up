import "server-only";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// Analytics event log (PRD §10.3). Never throws: tracking must not break a flow.

export type EventName =
  | "page_view" | "task_viewed" | "filter_changed" | "contact_ngo_tapped" | "booking_created"
  | "confirmation_viewed" | "booking_confirmed" | "booking_released" | "standby_toggled"
  | "standby_offer_accepted" | "nudge_shown" | "nudge_opened" | "nudge_dismissed"
  | "task_published" | "applicant_decided" | "attendance_marked"
  | `lab_${string}`;

/** The active Test Lab session id (prototype), used to group a tester's events. */
export async function labSessionId(): Promise<string | null> {
  try {
    return (await cookies()).get("su_lab_session")?.value ?? null;
  } catch {
    return null;
  }
}

export async function track(
  name: EventName,
  props: Record<string, unknown> = {},
  userId: string | null = null,
): Promise<void> {
  try {
    await query("insert into events (user_id, session_id, name, props) values ($1, $2, $3, $4::jsonb)", [
      userId,
      await labSessionId(),
      name,
      JSON.stringify(props),
    ]);
  } catch (e) {
    console.error("[show-up] track failed", name, e);
  }
}
