import type { Metadata } from "next";
import Link from "next/link";
import { OnePeep } from "@/components/art";
import { Brand } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "This page isn't here" };

// Unknown pages and missing activities.
export default function NotFound() {
  return (
    <>
      <header><div className="mx-auto max-w-5xl px-4 py-3"><Brand /></div></header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 text-center">
        <OnePeep index={3} />
        <h1 className="mt-5 text-4xl leading-10">This page isn&apos;t here.</h1>
        <p className="mt-3 text-ink-soft">The activity may have finished or been taken down.</p>
        <Link href="/" className={cn(buttonVariants({ size: "tap" }), "mt-6 h-14 px-8 text-lg")}>See what&apos;s on</Link>
      </main>
    </>
  );
}
