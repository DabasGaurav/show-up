import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";
import { isMvp } from "@/lib/flags";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Tell us about your NGO" };

export default async function NgoJoinPage() {
  const user = await requireUser("/ngo/join");
  if (await getOrgForUser(user.id)) redirect("/ngo");
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">Tell us about your NGO.</h1>
        <p className="mt-3 text-ink-soft">Three short steps. We call every NGO before they go live.</p>
        <div className="mt-6 rounded-xl bg-card p-5">
          <JoinForm needInvite={isMvp} defaults={{ contact_name: user.name, contact_phone: user.phone?.replace("+91", "") ?? "" }} />
        </div>
      </main>
    </>
  );
}
