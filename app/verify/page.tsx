import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getUser, safeNext } from "@/lib/auth";
import { isMvp } from "@/lib/flags";
import { authMethod } from "@/lib/otp";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Sign in" };

const CODE_HINT: Record<string, string | undefined> = {
  simulated: "Trying it out? Any 6 digits will work.",
  email: "We sent it to your email.",
  dev: "Running locally: the code is in the server log.",
};

// Sign in / phone check (brief B3).
export default async function VerifyPage(props: PageProps<"/verify">) {
  const { next } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getUser()) redirect(target);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="text-4xl leading-10">Let&apos;s get you in.</h1>
        <p className="mt-3 text-ink-soft">Just your name and number. NGOs only see your number once you&apos;re confirmed.</p>
        <div className="mt-6 rounded-xl bg-card p-5">
          <VerifyForm next={target} needEmail={isMvp} codeHint={CODE_HINT[authMethod()]} />
        </div>
      </main>
    </>
  );
}
