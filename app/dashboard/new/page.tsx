import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site-header";
import { now } from "@/lib/clock";
import { istDateKey } from "@/lib/format";
import { requireOrg } from "@/lib/ngo";
import { PostForm } from "./form";

export const metadata: Metadata = { title: "Post an activity" };

export default async function PostActivity() {
  const { user, org } = await requireOrg("/dashboard/new");
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2">← Dashboard</Link>
        <h1 className="mb-5 text-4xl leading-10">Post an activity</h1>
        <PostForm
          defaults={{
            orgName: org.name,
            city: org.city,
            contactName: org.contact_name ?? user.name,
            contactPhone: (org.contact_phone ?? user.phone ?? "").replace("+91", ""),
            today: istDateKey(await now()),
          }}
        />
      </main>
    </>
  );
}
