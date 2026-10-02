import type { Metadata } from "next";
import { Header } from "@/components/site-header";
import { getUser } from "@/lib/auth";
import { ContactForm } from "./form";

export const metadata: Metadata = { title: "Write to us" };

export default async function Contact() {
  const user = await getUser();
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <h1 className="text-4xl leading-10">Write to us.</h1>
        <p className="mt-3 text-ink-soft">A person on our team reads every message and writes back.</p>
        <div className="mt-6 rounded-xl bg-card p-5"><ContactForm defaults={{ name: user?.name ?? "", email: user?.email ?? "" }} /></div>
      </main>
    </>
  );
}
