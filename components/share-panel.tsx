"use client";

import { useState } from "react";
import { Check, Copy, Camera, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Share link with copy, WhatsApp share and an Instagram caption (§6.1 Screen 7). */
export function SharePanel({ url, text, caption }: { url: string; text: string; caption: string }) {
  const [copied, setCopied] = useState<"link" | "caption" | null>(null);
  const copy = async (what: "link" | "caption", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard can be blocked (e.g. non-secure context); the link stays selectable below.
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };
  return (
    <div className="space-y-3">
      <input
        readOnly
        value={url}
        aria-label="Share link"
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 w-full rounded-lg border bg-muted px-3 font-mono text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" size="tap" onClick={() => copy("link", url)}>
          {copied === "link" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied === "link" ? "Link copied" : "Copy link"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "tap", variant: "outline" }))}
        >
          <MessageCircle aria-hidden />
          Share on WhatsApp
        </a>
        <Button type="button" size="tap" variant="outline" onClick={() => copy("caption", caption)}>
          {copied === "caption" ? <Check aria-hidden /> : <Camera aria-hidden />}
          {copied === "caption" ? "Caption copied" : "Instagram caption"}
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied === "link" ? "Link copied" : copied === "caption" ? "Caption copied" : ""}
      </p>
    </div>
  );
}
