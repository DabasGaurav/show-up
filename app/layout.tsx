import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { S } from "@/lib/strings";
import { LabBar } from "@/components/lab-bar";
import { MessagePreview } from "@/components/message-preview";
import { isEnabled, isPrototype } from "@/lib/flags";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: S.brand, template: `%s · ${S.brand}` },
  description: S.pitch,
};

export const viewport: Viewport = { themeColor: "#1f3864" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t bg-card px-4 py-5 text-xs text-muted-foreground">
          <div className="mx-auto max-w-5xl space-y-1">
            <p>{S.footer.privacy}</p>
            {isPrototype && <p>{S.footer.prototype}</p>}
          </div>
        </footer>
        {isEnabled("MESSAGE_PREVIEW") && <MessagePreview />}
        <LabBar />
      </body>
    </html>
  );
}
