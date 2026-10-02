import "server-only";
import { randomInt } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { isPrototype } from "@/lib/flags";
import { notify } from "@/lib/notify";

// Phone check (F3).
//  - prototype: simulated. The code shows in the Message preview and any 6 digits pass.
//  - mvp:       AUTH_METHOD=sms   → Supabase phone auth (needs an Indian SMS provider)
//               AUTH_METHOD=email → code by email, phone number still collected (§8.1 fallback)
//               AUTH_METHOD=dev   → code printed in the server log (local development only)

export type AuthMethod = "simulated" | "sms" | "email" | "dev";

export function authMethod(): AuthMethod {
  if (isPrototype) return "simulated";
  const m = process.env.AUTH_METHOD;
  if (m === "sms" || m === "email") return m;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_METHOD must be 'sms' or 'email' in production");
  }
  return "dev";
}

const TTL_MIN = 10;
const key = (phone: string) => `otp:${phone}`;

async function storeCode(phone: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [key(phone), JSON.stringify({ code, expires: Date.now() + TTL_MIN * 60_000, tries: 0 })],
  );
  return code;
}

async function checkStoredCode(phone: string, code: string): Promise<boolean> {
  const row = await queryOne<{ value: { code: string; expires: number; tries: number } }>(
    "select value from app_state where key = $1",
    [key(phone)],
  );
  if (!row || row.value.expires < Date.now() || row.value.tries >= 5) return false;
  if (row.value.code !== code) {
    await query("update app_state set value = jsonb_set(value, '{tries}', to_jsonb($2::int)) where key = $1", [
      key(phone),
      row.value.tries + 1,
    ]);
    return false;
  }
  await query("delete from app_state where key = $1", [key(phone)]);
  return true;
}

async function supabaseAuth(path: string, body: object): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required for AUTH_METHOD=sms");
  const res = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function sendCode(phone: string, email: string | null): Promise<{ ok: boolean; error?: string }> {
  const method = authMethod();
  if (method === "sms") {
    const ok = await supabaseAuth("otp", { phone, create_user: true });
    return ok ? { ok } : { ok, error: "We couldn't send the code. Check the number and try again." };
  }
  const code = await storeCode(phone);
  const text = `${code} is your Show-Up code. It works for ${TTL_MIN} minutes.`;
  if (method === "simulated") {
    await notify({ type: "otp", channel: "sms", to: phone, text });
  } else if (method === "email") {
    if (!email) return { ok: false, error: "Please add your email so we can send your code." };
    await notify({ type: "otp", channel: "email", to: email, text, subject: "Your Show-Up code" });
  } else {
    console.log(`[show-up] DEV phone check code for ${phone}: ${code}`);
  }
  return { ok: true };
}

export async function verifyCode(phone: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  switch (authMethod()) {
    case "simulated":
      return true; // any 6 digits pass (§6.1 Screen 1)
    case "sms":
      return supabaseAuth("verify", { phone, token: code, type: "sms" });
    default:
      return checkStoredCode(phone, code);
  }
}
