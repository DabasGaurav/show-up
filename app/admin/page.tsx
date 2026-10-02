import { VerifiedNgoBadge, Chip } from "@/components/badges";
import { ClockControl } from "@/components/clock-control";
import { Button } from "@/components/ui/button";
import { inviteCodes, listOrgs } from "@/lib/data/orgs";
import { isAdmin } from "@/lib/auth";
import { isEnabled, isMvp } from "@/lib/flags";
import { fmtDate, fmtPhone } from "@/lib/format";
import { addInviteCodeAction, setOrgStatusAction, setOrgVerifiedAction } from "./actions";

const TONE = { pending: "amber", approved: "green", rejected: "grey" } as const;
const LABEL = { pending: "Awaiting approval", approved: "Approved", rejected: "Rejected" } as const;

export default async function AdminNgosPage() {
  if (!(await isAdmin())) return null; // the layout shows the passcode form
  const [orgs, codes] = await Promise.all([listOrgs(), isMvp ? inviteCodes() : Promise.resolve([])]);
  const canVerify = isEnabled("F10");

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">NGOs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve an NGO before its tasks can be shared.
          {canVerify && " Verifying simulates the registration check for the Verified NGO badge."}
        </p>
        {orgs.length === 0 && <p className="mt-6 rounded-xl border bg-card p-5 text-sm">No NGOs have signed up yet.</p>}
        <ul className="mt-4 space-y-3">
          {orgs.map((o) => (
            <li key={o.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{o.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {o.city} · {o.causes.join(", ") || "No causes"} · joined {fmtDate(o.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone={TONE[o.status]}>{LABEL[o.status]}</Chip>
                  {o.verified_at && <VerifiedNgoBadge />}
                </div>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="inline text-muted-foreground">Contact: </dt><dd className="inline">{o.contact_name} · {o.contact_phone ? fmtPhone(o.contact_phone) : "—"}</dd></div>
                <div><dt className="inline text-muted-foreground">Registration: </dt><dd className="inline">{o.registration_no ?? "Not given"}</dd></div>
                <div><dt className="inline text-muted-foreground">12A / 80G: </dt><dd className="inline">{o.tax_12a_80g ?? "Not given"}</dd></div>
                <div><dt className="inline text-muted-foreground">Tasks: </dt><dd className="inline">{o.task_count}</dd></div>
                {o.invite_code && <div><dt className="inline text-muted-foreground">Invite code: </dt><dd className="inline">{o.invite_code}</dd></div>}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.status !== "approved" && (
                  <form action={setOrgStatusAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <Button type="submit" name="status" value="approved" size="tap">Approve</Button>
                  </form>
                )}
                {o.status !== "rejected" && (
                  <form action={setOrgStatusAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <Button type="submit" name="status" value="rejected" size="tap" variant="outline">Reject</Button>
                  </form>
                )}
                {canVerify && o.status === "approved" && (
                  <form action={setOrgVerifiedAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <Button type="submit" name="verified" value={o.verified_at ? "false" : "true"} size="tap" variant="outline">
                      {o.verified_at ? "Remove Verified NGO" : "Mark registration checked"}
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {isEnabled("SIMULATED_CLOCK") && <ClockControl path="/admin" />}

      {isMvp && (
        <section>
          <h2 className="text-lg font-semibold">Invite codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">NGOs need a code to sign up at /ngo/join.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {codes.map((c) => (
              <li key={c} className="rounded-lg border bg-card px-3 py-2 font-mono text-sm">{c}</li>
            ))}
            {codes.length === 0 && <li className="text-sm text-muted-foreground">No codes yet.</li>}
          </ul>
          <form action={addInviteCodeAction} className="mt-3">
            <Button type="submit" size="tap" variant="outline">Create invite code</Button>
          </form>
        </section>
      )}
    </div>
  );
}
