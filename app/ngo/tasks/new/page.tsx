import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { now, wallClockMs } from "@/lib/clock";
import { track } from "@/lib/events";
import { isEnabled } from "@/lib/flags";
import { istDateKey } from "@/lib/format";
import { requireOrg } from "@/lib/ngo";
import { TaskForm } from "./task-form";

export const metadata: Metadata = { title: "New task" };

// Screen 7: Task template (F1, F14).
export default async function NewTaskPage() {
  const { user, org } = await requireOrg("/ngo/tasks/new");
  await track("lab_template_opened", {}, user.id);
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Link href="/ngo" className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold">New task</h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          One page. Fill it in once and share one link, with every detail a volunteer needs.
        </p>
        <TaskForm
          showTrust={isEnabled("F14")}
          showApproval={isEnabled("F15")}
          defaults={{
            orgName: org.name,
            orgVerified: isEnabled("F10") && org.verified_at !== null,
            city: org.city,
            contactName: org.contact_name ?? user.name,
            contactPhone: (org.contact_phone ?? user.phone ?? "").replace("+91", ""),
            minDate: istDateKey(await now()),
            openedAt: wallClockMs(),
          }}
        />
      </main>
    </>
  );
}
