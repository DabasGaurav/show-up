import { query } from "@/lib/db";
import { requireFeature } from "@/lib/flags";

export const dynamic = "force-dynamic";

// Feed for the prototype's Message preview panel: everything the system "sent".
export async function GET() {
  requireFeature("MESSAGE_PREVIEW");
  const rows = await query(
    `select n.id, n.type, n.channel, n.payload, n.due_at, n.sent_at, u.name as user_name
     from notifications n left join users u on u.id = n.user_id
     order by n.due_at desc, n.sent_at desc nulls last
     limit 60`,
  );
  return Response.json({ messages: rows });
}
