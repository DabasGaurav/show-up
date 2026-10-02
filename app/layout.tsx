import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Show-Up", template: "%s · Show-Up" },
  description: "Give a few hours. Make them count. Find something to do near you, and save your spot.",
};

export const viewport: Viewport = { themeColor: "#0f5257" };

const footLink = "inline-flex min-h-11 items-center underline underline-offset-2";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="px-4 pt-10 pb-28 text-sm text-ink-soft">
          <div className="mx-auto max-w-5xl">
            <div>Your number stays private until you&apos;re confirmed. We never sell your details.</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4">
              <span className="font-heading font-semibold text-ink">Show-Up</span>
              <Link href="/for-ngos" className={footLink}>For NGOs</Link>
              <Link href="/privacy" className={footLink}>Privacy</Link>
              <Link href="/contact" className={footLink}>Write to us</Link>
              <span>Made in India</span>
            </div>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
