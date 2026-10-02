import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/site-header";
import { getUser, safeNext } from "@/lib/auth";
import { SignInForm } from "./form";

export const metadata: Metadata = { title: "Sign in" };

const a = "font-semibold text-primary underline underline-offset-2";

// Sign in: for people who already have an account.
export default async function SignInPage(props: PageProps<"/signin">) {
  const { next, expired } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getUser()) redirect(target);
  const ngo = target.startsWith("/dashboard") || target.startsWith("/for-ngos");
  const signUp = ngo ? "/for-ngos/signup" : `/signup?next=${encodeURIComponent(target)}`;
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">Welcome back.</h1>
        <p className="mt-3 text-ink-soft">No password. We email you a link.</p>
        {expired && <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-medium">That link has run out. Let&apos;s send a fresh one.</p>}
        <div className="mt-6 rounded-xl bg-card p-5"><SignInForm next={target} signUpHref={signUp} /></div>
        <p className="mt-5 text-center">New here? <Link href={signUp} className={a}>Sign up to volunteer</Link></p>
        <p className="mt-2 text-center">From an NGO? <Link href="/for-ngos/signup" className={a}>Sign up your NGO</Link></p>
      </main>
    </>
  );
}
