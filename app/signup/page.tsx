import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroPeeps } from "@/components/art";
import { Tick } from "@/components/kit";
import { Header } from "@/components/site-header";
import { getUser, safeNext } from "@/lib/auth";
import { SignUpForm } from "./form";

export const metadata: Metadata = { title: "Sign up to volunteer" };

const a = "font-semibold text-primary underline underline-offset-2";
const POINTS = ["Save a spot in one tap", "Reminders so you never forget", "A track record NGOs can trust"];

// Volunteer sign-up.
export default async function SignUpPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  const target = safeNext(typeof next === "string" ? next : null, "/account");
  if (await getUser()) redirect(target);
  return (
    <>
      <Header />
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-6 px-4 py-4 sm:grid-cols-2 sm:gap-8 sm:py-10">
        <div>
          <h1 className="hero-title text-balance">Sign up to volunteer.</h1>
          <ul className="mt-4 space-y-2 font-medium">
            {POINTS.map((p) => <li key={p} className="flex items-center gap-2"><Tick />{p}</li>)}
          </ul>
          <HeroPeeps className="mt-8 hidden max-w-xs sm:grid" />
        </div>
        <div>
          <div className="rounded-xl bg-card p-5"><SignUpForm next={target} /></div>
          <p className="mt-5 text-center">Already signed up? <Link href={`/signin?next=${encodeURIComponent(target)}`} className={a}>Sign in</Link></p>
          <p className="mt-2 text-center">From an NGO? <Link href="/for-ngos/signup" className={a}>Sign up your NGO</Link></p>
        </div>
      </main>
    </>
  );
}
