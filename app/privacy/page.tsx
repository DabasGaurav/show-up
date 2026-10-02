import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Eye, Lock, Trash2, UserRound } from "lucide-react";
import { Header } from "@/components/site-header";

export const metadata: Metadata = { title: "Privacy" };

const POINTS = [
  { icon: <UserRound />, title: "What we keep", text: "Your name, email, mobile number, city and the spots you save." },
  { icon: <Lock />, title: "Who sees your number", text: "Only the NGO, and only once your spot is confirmed." },
  { icon: <Eye />, title: "What NGOs see", text: "Your first name and track record. Your number comes once you say yes." },
  { icon: <BellRing />, title: "When we email you", text: "About your own plans, and one note if you've been away a while. Never ads." },
  { icon: <Trash2 />, title: "Deleting your details", text: "Write to us and we delete your account within 7 days. We never sell details." },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="text-3xl leading-9">Your details stay yours.</h1>
        <ul className="mt-6 space-y-3">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-3 rounded-xl bg-card p-4">
              <span className="mt-0.5 shrink-0 text-primary [&>svg]:size-5" aria-hidden>{p.icon}</span>
              <div>
                <h2 className="font-sans text-base font-semibold">{p.title}</h2>
                <p className="text-ink-soft">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <h2 id="contact" className="mt-10 scroll-mt-6 text-2xl">Questions?</h2>
        <p className="mt-2"><Link href="/contact" className="font-semibold text-primary underline underline-offset-2">Write to us</Link>. A person on our team will reply.</p>
      </main>
    </>
  );
}
