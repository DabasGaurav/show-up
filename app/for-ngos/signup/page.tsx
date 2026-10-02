import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/site-header";
import { getUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";
import { NgoForm } from "../form";

export const metadata: Metadata = { title: "Sign up your NGO" };

const a = "font-semibold text-primary underline underline-offset-2";

// NGO sign-up.
export default async function NgoSignUp() {
  const user = await getUser();
  if (user && (await getOrgForUser(user.id))) redirect("/dashboard");
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">Sign up your NGO.</h1>
        <p className="mt-3 text-ink-soft">It&apos;s free. We call you within a day to get you live.</p>
        <div className="mt-6 rounded-xl bg-card p-5">
          <NgoForm signedIn={Boolean(user)} defaults={{ your_name: user?.name ?? "", phone: user?.phone?.replace("+91", "") ?? "" }} />
        </div>
        {!user && <p className="mt-5 text-center">Already signed up? <Link href="/signin?next=/dashboard" className={a}>Sign in</Link></p>}
        <p className="mt-2 text-center">Here to volunteer? <Link href="/signup" className={a}>Sign up to volunteer</Link></p>
      </main>
    </>
  );
}
