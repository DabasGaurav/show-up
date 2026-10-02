import type { Metadata } from "next";
import { demoNow } from "@/lib/demo";
import { fmtDayDate, istDateKey } from "@/lib/format";
import { Standby } from "./standby";

export const metadata: Metadata = { title: "Free at short notice" };
export const dynamic = "force-dynamic";

export default function DemoStandby() {
  const now = demoNow();
  const days = [1, 2, 3, 4].map((i) => {
    const d = new Date(now.getTime() + i * 864e5);
    return { key: istDateKey(d), label: fmtDayDate(d) };
  });
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
      <h1 className="text-4xl leading-10">Step in when someone can&apos;t.</h1>
      <Standby days={days} />
    </main>
  );
}
