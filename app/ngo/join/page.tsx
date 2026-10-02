import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";
import { isMvp } from "@/lib/flags";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join as an NGO" };

export default async function NgoJoinPage() {
  const user = await requireUser("/ngo/join");
  if (await getOrgForUser(user.id)) redirect("/ngo");
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Join as an NGO</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us about your organisation. The Show-Up team approves every NGO before its tasks can be shared.
        </p>
        <div className="mt-6 rounded-xl border bg-card p-5">
          <JoinForm
            needInvite={isMvp}
            registrationOptional={isMvp}
            defaults={{ contact_name: user.name, contact_phone: user.phone?.replace("+91", "") ?? "" }}
          />
        </div>
      </main>
    </>
  );
}
