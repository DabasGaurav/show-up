"use client";

import { useState } from "react";
import { Camera, Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "@/components/toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The link with copy, WhatsApp and Instagram buttons (brief B8). */
export function SharePanel({ url, text, caption }: { url: string; text: string; caption: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(message);
    } catch {
      toast("Couldn't copy. Press and hold the link instead.");
    }
  };
  return (
    <div className="space-y-3">
      <input
        readOnly
        value={url}
        aria-label="Your link"
        onFocus={(e) => e.currentTarget.select()}
        className="h-14 w-full rounded-xl border border-primary/30 bg-primary-soft px-4 text-base font-semibold text-primary"
      />
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap" }), "h-14 w-full text-lg")}>
        <MessageCircle aria-hidden />
        Share on WhatsApp
      </a>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" size="tap" variant="outline" onClick={async () => { await copy(url, "Link copied."); setCopied(true); }}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          Copy link
        </Button>
        <Button type="button" size="tap" variant="outline" onClick={() => copy(caption, "Copied. Paste it into Instagram.")}>
          <Camera aria-hidden />
          Copy for Instagram
        </Button>
      </div>
    </div>
  );
}
