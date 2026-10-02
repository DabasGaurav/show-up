import { Chip } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { listIdChecks } from "@/lib/data/volunteers";
import { requireFeature } from "@/lib/flags";
import { fmtPhone } from "@/lib/format";
import { decideIdAction } from "../actions";

const TONE = { pending: "amber", approved: "green", rejected: "grey", none: "grey" } as const;
const LABEL = { pending: "Under review", approved: "Approved", rejected: "Rejected", none: "Not submitted" } as const;

// Prototype: simulate the ID check that moves a volunteer from New to Verified.
export default async function AdminIdsPage() {
  requireFeature("F8");
  if (!(await isAdmin())) return null;
  const rows = await listIdChecks();
  return (
    <section>
      <h1 className="text-2xl font-bold">ID checks</h1>
      <p className="mt-1 text-sm text-muted-foreground">Simulated. No ID image is stored in the prototype.</p>
      {rows.length === 0 && <p className="mt-4 rounded-xl border bg-card p-5 text-sm">No IDs submitted yet.</p>}
      <ul className="mt-4 space-y-3">
        {rows.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <p className="font-semibold">{u.name}</p>
              <p className="text-sm text-muted-foreground">{u.id_type ?? "ID"} · {u.phone ? fmtPhone(u.phone) : "—"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={TONE[u.id_status]}>{LABEL[u.id_status]}</Chip>
              <form action={decideIdAction} className="flex gap-2">
                <input type="hidden" name="id" value={u.id} />
                {u.id_status !== "approved" && <Button type="submit" name="decision" value="approve" size="tap">Approve</Button>}
                {u.id_status !== "rejected" && <Button type="submit" name="decision" value="reject" size="tap" variant="outline">Reject</Button>}
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
