"use server";

import { revalidatePath } from "next/cache";
import { setPassword } from "@/lib/accounts";
import { requireUser } from "@/lib/auth";
import { nameProblem, passwordProblem } from "@/lib/validate";
import { CAUSES } from "@/lib/constants";
import { readPlace } from "@/lib/place";
import { query, queryOne } from "@/lib/db";
import { normalisePhone } from "@/lib/format";

export interface AccountState {
  ok?: boolean;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function saveAccountAction(_prev: AccountState, form: FormData): Promise<AccountState> {
  const user = await requireUser("/account");
  const name = str(form.get("name"));
  const city = readPlace(form, true);
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const badName = nameProblem(name);
  if (badName) return { error: badName };
  // The mobile number can stay empty until the first spot is saved.
  const typed = str(form.get("phone"));
  const phone = typed ? normalisePhone(typed) : null;
  if (typed && !phone) return { error: "That number doesn't look right. It should have 10 digits." };
  if (!city) return { error: "Pick your city, or type your town." };
  if (phone && await queryOne("select 1 as taken from users where phone = $1 and id <> $2", [phone, user.id])) return { error: "That number is on another account." };
  const password = String(form.get("password") ?? "");
  const badPassword = password ? passwordProblem(password) : null;
  if (badPassword) return { error: badPassword };
  await query("update users set name = $2, phone = $3, city = $4, saved_causes = $5 where id = $1", [user.id, name, phone, city, causes]);
  if (password) await setPassword(user.id, password);
  revalidatePath("/account");
  return { ok: true };
}
