import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/site-header";
import { getUser, safeNext } from "@/lib/auth";
import { SignInForm } from "./form";

export const metadata: Metadata = { title: "Sign in" };

// Sign in: one screen, no account page.
export default async function SignInPage(props: PageProps<"/signin">) {
  const { next, expired } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getUser()) redirect(target);
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">Let&apos;s get you in.</h1>
        <p className="mt-3 text-ink-soft">NGOs only see your number once you&apos;re confirmed.</p>
        {expired && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-medium">That link has run out. Let&apos;s send a fresh one.</p>}
        <div className="mt-6 rounded-xl bg-card p-5"><SignInForm next={target} /></div>
      </main>
    </>
  );
}
