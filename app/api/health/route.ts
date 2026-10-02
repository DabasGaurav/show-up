import { APP_MODE } from "@/lib/flags";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await queryOne<{ tables: number }>(
    "select count(*)::int as tables from pg_tables where schemaname = 'public'",
  );
  return Response.json({ ok: true, mode: APP_MODE, tables: row?.tables ?? 0 });
}
