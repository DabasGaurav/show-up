import type { Metadata } from "next";
import { Lock, PhoneOff, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = { title: "Privacy" };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="text-3xl leading-9">Your details stay yours.</h1>
        <ul className="mt-6 space-y-4">
          <li className="flex gap-3 rounded-xl bg-card p-4">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>An NGO sees your number only once your spot is confirmed.</p>
          </li>
          <li className="flex gap-3 rounded-xl bg-card p-4">
            <PhoneOff className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>We message you about your own plans. Nothing else, and never ads.</p>
          </li>
          <li className="flex gap-3 rounded-xl bg-card p-4">
            <Trash2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>We never sell your details. Ask us and we&apos;ll delete them.</p>
          </li>
        </ul>
        <h2 id="contact" className="mt-10 scroll-mt-6 text-2xl">Contact us</h2>
        <p className="mt-2 text-ink-soft">
          {CONTACT ? (
            <>Write to <a href={`mailto:${CONTACT}`} className="text-primary underline underline-offset-2">{CONTACT}</a>. A person on our team will reply.</>
          ) : (
            "Reply to any message you got from us. A person on our team will read it."
          )}
        </p>
      </main>
    </>
  );
}
