import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { LabBar } from "@/components/lab-bar";
import { MessagePreview } from "@/components/message-preview";
import { Toaster } from "@/components/toaster";
import { isEnabled } from "@/lib/flags";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Show-Up", template: "%s · Show-Up" },
  description: "Give a few hours. Make them count. Real people, real causes, close to home.",
};

export const viewport: Viewport = { themeColor: "#0f5257" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="px-4 pt-10 pb-28 text-sm text-ink-soft">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-heading font-semibold text-ink">Show-Up</span>
            <span aria-hidden>·</span>
            <span>Made in India for people who show up</span>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-2">Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/privacy#contact" className="inline-flex min-h-11 items-center underline underline-offset-2">Contact us</Link>
          </div>
        </footer>
        <Toaster />
        {isEnabled("MESSAGE_PREVIEW") && <MessagePreview />}
        <LabBar />
      </body>
    </html>
  );
}
