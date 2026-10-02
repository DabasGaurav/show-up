"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "@/components/toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The share link, with Share on WhatsApp (prefilled message) and Copy link. */
export function SharePanel({ url, text }: { url: string; text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      toast("Couldn't copy. Press and hold the link instead.");
    }
  };
  return (
    <div className="space-y-3">
      <input readOnly value={url} aria-label="Your link" onFocus={(e) => e.currentTarget.select()} className="h-14 w-full rounded-xl border border-primary/30 bg-primary-soft px-4 text-base font-semibold text-primary" />
      <div className="grid gap-3 sm:grid-cols-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap" }), "h-14 text-lg")}>
          <MessageCircle aria-hidden />Share on WhatsApp
        </a>
        <Button type="button" size="tap" variant="outline" className="h-14 text-lg" onClick={copy}><Copy aria-hidden />Copy link</Button>
      </div>
    </div>
  );
}
