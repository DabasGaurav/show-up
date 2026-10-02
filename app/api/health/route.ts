import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await queryOne<{ tables: number }>("select count(*)::int as tables from pg_tables where schemaname = 'public'");
  return Response.json({ ok: true, tables: row?.tables ?? 0, email: Boolean(process.env.RESEND_API_KEY) });
}
