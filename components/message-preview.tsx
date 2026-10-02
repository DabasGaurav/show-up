"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, X } from "lucide-react";
import { fmtDateTime, fmtPhone } from "@/lib/format";
import { MESSAGE_LABEL } from "@/lib/messages";

interface Msg {
  id: string;
  type: string;
  channel: "sms" | "whatsapp" | "email" | "in_app";
  payload: { to: string | null; text: string; link: string | null };
  due_at: string;
  user_name: string | null;
}

const CHANNEL = { sms: "SMS", whatsapp: "WhatsApp", email: "Email", in_app: "In-app" } as const;

/** Prototype only: a slide-over listing every message the system "sent" (§6.2). */
export function MessagePreview() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/messages", { cache: "no-store" });
    if (res.ok) setMessages((await res.json()).messages);
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = setTimeout(load, 0);
    const id = setInterval(load, 4000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, load]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Message preview"
        title="Message preview"
        className="fixed right-3 bottom-20 z-40 flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-2 ring-white"
      >
        <MessageSquareText className="size-5" aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Message preview"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
          >
            <header className="flex items-center justify-between border-b bg-card px-4 py-2">
              <div>
                <h2 className="font-semibold">Message preview</h2>
                <p className="text-xs text-muted-foreground">Prototype: nothing is really sent.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted">
                <X className="size-5" aria-hidden />
              </button>
            </header>
            <ul className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages === null && <li className="text-sm text-muted-foreground">Loading…</li>}
              {messages?.length === 0 && <li className="text-sm text-muted-foreground">No messages yet.</li>}
              {messages?.map((m) => (
                <li key={m.id} className="rounded-xl border bg-card p-3 text-sm">
                  <p className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-brand">{CHANNEL[m.channel]} · {MESSAGE_LABEL[m.type] ?? m.type}</span>
                    <time dateTime={m.due_at}>{fmtDateTime(new Date(m.due_at))}</time>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    To: {m.user_name ?? "—"}{m.payload.to ? ` · ${m.payload.to.startsWith("+") ? fmtPhone(m.payload.to) : m.payload.to}` : ""}
                  </p>
                  <p className="mt-2 break-words whitespace-pre-wrap">{m.payload.text}</p>
                  {m.payload.link && (
                    <a href={m.payload.link} className="mt-2 inline-flex min-h-11 items-center text-brand underline underline-offset-2" onClick={() => setOpen(false)}>
                      Open link
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}
