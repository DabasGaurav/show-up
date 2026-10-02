"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

// Short, warm confirmations after actions (brief A4.7). A page can ask for one with
// `?toast=key` after a redirect, or call toast("…") in the browser.

const MESSAGES: Record<string, string> = {
  in: "You're in.",
  out: "You're signed out.",
  posted: "Posted. Your link is ready.",
  yes: "Lovely. See you there.",
  freed: "Done. Your spot is open for someone else.",
  sent: "Thanks! We'll call you within a day.",
  waitlist: "Done. We'll email you when something's on.",
  bademail: "That email doesn't look right.",
  saved: "Saved.",
  deleted: "Deleted.",
  written: "Thanks. We'll write back soon.",
  noowner: "That NGO has no coordinator account to open.",
};

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("showup:toast", { detail: message }));
}

function ToasterInner() {
  const [message, setMessage] = useState<string | null>(null);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const key = params.get("toast");

  useEffect(() => {
    const on = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener("showup:toast", on);
    return () => window.removeEventListener("showup:toast", on);
  }, []);

  useEffect(() => {
    if (!key) return;
    const id = setTimeout(() => {
      if (MESSAGES[key]) setMessage(MESSAGES[key]);
      const next = new URLSearchParams(params.toString());
      next.delete("toast");
      router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 0);
    return () => clearTimeout(id);
  }, [key, params, pathname, router]);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4">
      {message && (
        <p className="flex max-w-sm animate-toast-in items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-card">
          <CheckCircle2 className="size-5 shrink-0 text-accent" aria-hidden />
          {message}
        </p>
      )}
    </div>
  );
}

export function Toaster() {
  return (
    <Suspense fallback={null}>
      <ToasterInner />
    </Suspense>
  );
}
