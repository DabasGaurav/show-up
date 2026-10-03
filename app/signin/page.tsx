import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Tick } from "@/components/kit";
import { Header } from "@/components/site-header";
import { getUser, safeNext } from "@/lib/auth";
import { SignInForm } from "./form";

export const metadata: Metadata = { title: "Sign in or sign up" };

// One page for volunteers: sign in if we know the email, sign up if we don't.
export default async function SignInPage(props: PageProps<"/signin">) {
  const { next, expired } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null, "/start");
  if (await getUser()) redirect(target);
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">Sign in or sign up.</h1>
        <p className="mt-3 flex items-center gap-2 font-medium"><Tick />Just your email. No password.</p>
        {expired && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-medium">That link has run out. Let&apos;s send a fresh one.</p>}
        <div className="mt-6 rounded-xl bg-card p-5"><SignInForm next={target} /></div>
        <p className="mt-5 text-center">From an NGO? <Link href="/for-ngos/signup" className="font-semibold text-primary underline underline-offset-2">Sign up your NGO</Link></p>
      </main>
    </>
  );
}
