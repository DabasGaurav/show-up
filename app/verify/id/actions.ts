"use server";

import { redirect } from "next/navigation";
import { requireUser, safeNext } from "@/lib/auth";
import { ID_TYPES, submitId } from "@/lib/data/volunteers";
import { requireFeature } from "@/lib/flags";

export async function submitIdAction(form: FormData) {
  requireFeature("F8");
  const next = safeNext(String(form.get("next") ?? ""), "/me");
  const user = await requireUser(`/verify/id?next=${encodeURIComponent(next)}`);
  const type = String(form.get("id_type"));
  if (!(ID_TYPES as readonly string[]).includes(type)) return;
  // The chosen photo is deliberately not uploaded: no ID image is stored in the prototype (§13).
  await submitId(user.id, type);
  redirect(`/verify/id?next=${encodeURIComponent(next)}`);
}
