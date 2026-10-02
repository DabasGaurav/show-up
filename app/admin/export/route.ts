import { isAdmin } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLS = ["ngo", "activity", "cause", "city", "starts", "person", "phone", "email", "status", "saved_at", "said_yes_at", "freed_at", "reason"];
const STATUS: Record<string, string> = {
  booked: "Saved", awaiting_confirmation: "Waiting for a yes", confirmed: "Confirmed", released_early: "Freed early",
  released_late: "Freed late", attended: "Came", no_show: "Didn't come",
};

// Every spot, as a CSV (times in UTC).
export async function GET() {
  if (!(await isAdmin())) return new Response("Not allowed", { status: 401 });
  const rows = await query<Record<string, unknown>>(
    `select o.name as ngo, t.title as activity, t.cause, t.city, oc.start_at as starts, u.name as person, u.phone, u.email,
            b.status, b.created_at as saved_at, b.confirmed_at as said_yes_at, b.released_at as freed_at, b.release_reason as reason
     from bookings b
     join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
     join organisations o on o.id = t.org_id join users u on u.id = b.user_id
     order by oc.start_at, b.created_at`,
  );
  const csv = toCsv(COLS, rows.map((r) => COLS.map((c) => (c === "status" ? (STATUS[String(r.status)] ?? r.status) : r[c]))));
  return csvResponse("show-up-spots.csv", csv);
}
