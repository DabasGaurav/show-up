import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/site-header";
import { getUser, safeNext } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SignInForm, SignUpForm } from "./form";

export const metadata: Metadata = { title: "Sign in or sign up" };

const a = "font-semibold text-primary underline underline-offset-2";
const tab = "flex min-h-11 items-center justify-center rounded-full text-sm font-semibold";

// One page for volunteers, two tabs: sign in, or create an account. Email and password, no waiting for an email.
export default async function SignInPage(props: PageProps<"/signin">) {
  const { next, mode } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null, "/start");
  if (await getUser()) redirect(target);
  const isNew = mode === "new";
  const q = `next=${encodeURIComponent(target)}`;
  const signInHref = `/signin?${q}`;
  const signUpHref = `/signin?mode=new&${q}`;
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">{isNew ? "Create your account." : "Welcome back."}</h1>
        <nav aria-label="Sign in or sign up" className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          <Link href={signInHref} aria-current={isNew ? undefined : "page"} className={cn(tab, !isNew && "bg-card text-primary shadow-card")}>Sign in</Link>
          <Link href={signUpHref} aria-current={isNew ? "page" : undefined} className={cn(tab, isNew && "bg-card text-primary shadow-card")}>Sign up</Link>
        </nav>
        <div className="mt-4 rounded-xl border border-border/70 bg-card p-5 shadow-card">
          {isNew ? <SignUpForm next={target} signInHref={signInHref} /> : <SignInForm next={target} signUpHref={signUpHref} />}
        </div>
        <p className="mt-5 text-center">From an NGO? <Link href="/for-ngos/signup" className={a}>Sign up your NGO</Link></p>
      </main>
    </>
  );
}
