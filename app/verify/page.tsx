import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getUser, safeNext } from "@/lib/auth";
import { isEnabled, isMvp } from "@/lib/flags";
import { authMethod } from "@/lib/otp";
import { S } from "@/lib/strings";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verify once" };

const CODE_HINT = {
  simulated: "Prototype: any 6 digits work. The code also shows in the Message preview.",
  sms: "It can take up to a minute to arrive by SMS.",
  email: "We sent the code to your email.",
  dev: "Local development: the code is printed in the server log.",
} as const;

// Screen 1, Step A: phone check (F3). Step B (ID) lives at /verify/id in the prototype.
export default async function VerifyPage(props: PageProps<"/verify">) {
  const { next } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getUser()) redirect(target);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <p className="text-sm font-medium text-brand">Verify once</p>
        <h1 className="mt-1 text-2xl font-bold">Confirm your phone</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One quick check, then you can book in one step. NGOs see your number only after your booking is accepted or
          confirmed.
        </p>
        <div className="mt-6 rounded-xl border bg-card p-5">
          <VerifyForm next={target} needEmail={isMvp} codeHint={CODE_HINT[authMethod()]} />
        </div>
        {isEnabled("F8") && (
          <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">{S.rules.trustLevels}</p>
        )}
      </main>
    </>
  );
}
