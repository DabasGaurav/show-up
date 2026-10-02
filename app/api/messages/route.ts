import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { requireFeature } from "@/lib/flags";

export const dynamic = "force-dynamic";

// Feed for the prototype's Message preview panel: everything the system "sent".
export async function GET() {
  requireFeature("MESSAGE_PREVIEW");
  const user = await getUser();
  const rows = await query(
    `select n.id, n.type, n.channel, n.payload, n.due_at, n.sent_at, u.name as user_name,
            (n.user_id is not null and n.user_id::text = $1) or (n.payload->>'to' = $2) as mine
     from notifications n left join users u on u.id = n.user_id
     order by n.due_at desc, n.sent_at desc nulls last
     limit 120`,
    [user?.id ?? "", user?.phone ?? ""],
  );
  return Response.json({ messages: rows, signedIn: user !== null });
}
