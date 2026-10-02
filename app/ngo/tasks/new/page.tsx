import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { now, wallClockMs } from "@/lib/clock";
import { queryOne } from "@/lib/db";
import { track } from "@/lib/events";
import { isEnabled } from "@/lib/flags";
import { istDateKey } from "@/lib/format";
import { requireOrg } from "@/lib/ngo";
import { TaskForm } from "./task-form";

export const metadata: Metadata = { title: "Post a need" };

// Post a need (brief B8).
export default async function NewTaskPage() {
  const { user, org } = await requireOrg("/ngo/tasks/new");
  await track("lab_template_opened", {}, user.id);
  const role = await queryOne<{ value: string }>("select value from app_state where key = $1", [`org_role:${org.id}`]);
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <Link href="/ngo" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2">← My NGO</Link>
        <h1 className="mb-5 text-4xl leading-10">What do you need help with?</h1>
        <TaskForm
          showTrust={isEnabled("F14")}
          showApproval={isEnabled("F15")}
          defaults={{
            orgName: org.name,
            orgVerified: org.verified_at !== null,
            city: org.city,
            contactName: org.contact_name ?? user.name,
            contactRole: typeof role?.value === "string" ? role.value : "",
            contactPhone: (org.contact_phone ?? user.phone ?? "").replace("+91", ""),
            minDate: istDateKey(await now()),
            openedAt: wallClockMs(),
          }}
        />
      </main>
    </>
  );
}
