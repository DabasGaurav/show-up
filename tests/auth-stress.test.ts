import { beforeEach, describe, expect, it } from "vitest";
import { signInAction, signUpAction } from "@/app/signin/actions";
import { createAccount, login } from "@/lib/accounts";
import { safeNext } from "@/lib/auth";
import { query } from "@/lib/db";
import { cookieJar } from "./setup";

// Stress tests for sign-up and sign-in: races, hostile input, guessing, redirects.

const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};
let n = 0;
const fresh = () => `stress${++n}@test.local`;
const signUp = (over: Record<string, string | string[]> = {}) =>
  signUpAction({}, form({ name: "Stress Tester", email: fresh(), password: "long enough pw", city: "Pune", ...over }));
const rows = async (email: string) => (await query<{ n: number }>("select count(*)::int as n from users where lower(email) = lower($1)", [email]))[0].n;

beforeEach(async () => {
  cookieJar.clear();
  await query("delete from auth_attempts");
});

describe("sign-up under stress", () => {
  it("25 sign-ups for one email at the same moment make exactly one account", async () => {
    const res = await Promise.all(Array.from({ length: 25 }, () => createAccount({ name: "Racer", email: "race@test.local", password: "long enough pw" })));
    expect(res.filter(Boolean)).toHaveLength(1);
    expect(await rows("race@test.local")).toBe(1);
  });

  it("treats the same email in other spellings as the same account", async () => {
    await createAccount({ name: "A", email: "Variant@Test.Local", password: "long enough pw" });
    for (const e of ["variant@test.local", " VARIANT@test.local ", "variant@test.local\n"]) {
      expect(await createAccount({ name: "B", email: e, password: "long enough pw" })).toBeNull();
    }
    expect(await rows("variant@test.local")).toBe(1);
  });

  it("turns away bad names, emails and passwords, each with a plain reason", async () => {
    const bad: [Record<string, string>, RegExp][] = [
      [{ name: "" }, /add your name/], [{ name: "   " }, /add your name/], [{ name: "x".repeat(10_000) }, /too long/],
      [{ email: "nope" }, /email/], [{ email: "a@b@c.com" }, /email/], [{ email: "a b@test.local" }, /email/],
      [{ email: `${"a".repeat(300)}@test.local` }, /email/], [{ email: "a@nodot" }, /email/],
      [{ password: "1234567" }, /at least 8/], [{ password: "        " }, /spaces/], [{ password: "p".repeat(1_000_000) }, /too long/],
      [{ city: "Atlantis" }, /city/], [{ city: "Other" }, /city/],
    ];
    for (const [over, why] of bad) {
      const r = await signUp(over);
      expect(r.go, JSON.stringify(over).slice(0, 60)).toBeUndefined();
      expect(r.error).toMatch(why);
    }
    expect(cookieJar.size).toBe(0); // nobody got signed in along the way
  });

  it("stores awkward but harmless input as plain text, and drops made-up causes", async () => {
    const email = fresh();
    const name = "Robert'); drop table users;-- <script>alert(1)</script>";
    expect((await signUp({ email, name, password: "🙂🙂🙂🙂🙂🙂🙂🙂", causes: ["Hacking", "Food"] })).go).toBeTruthy();
    const [u] = await query<{ name: string; saved_causes: string[] }>("select name, saved_causes from users where email = $1", [email]);
    expect(u).toEqual({ name, saved_causes: ["Food"] });
    expect((await login(email, "🙂🙂🙂🙂🙂🙂🙂🙂")).ok).toBe(true);
    expect((await signUp({ email: "नमस्ते@test.local" })).go).toBeTruthy();
  });

  it("only ever sends people on to a page of this site", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "javascript:alert(1)", "\\\\evil.example"]) {
      expect(safeNext(next), JSON.stringify(next)).toBe("/me");
      expect((await signUp({ next })).go).toBe("/start?toast=in");
      await query("delete from auth_attempts");
    }
    expect(safeNext("/a/some-activity?d=1&save=1")).toBe("/a/some-activity?d=1&save=1");
  });

  it("pauses bulk sign-ups from one visitor", async () => {
    for (let i = 0; i < 10; i++) expect((await signUp()).go).toBeTruthy();
    const eleventh = await signUp();
    expect(eleventh.go).toBeUndefined();
    expect(eleventh.error).toMatch(/Too many new accounts/);
  });
});

describe("sign-in under stress", () => {
  it("pauses after 8 wrong passwords, even for the right one, and never signs the guesser in", async () => {
    await createAccount({ name: "Victim", email: "victim@test.local", password: "the real password" });
    for (let i = 0; i < 8; i++) expect((await signInAction({}, form({ email: "victim@test.local", password: `guess-${i}` }))).error).toMatch(/isn't right/);
    const locked = await signInAction({}, form({ email: "victim@test.local", password: "the real password" }));
    expect(locked.go).toBeUndefined();
    expect(locked.error).toMatch(/Too many tries/);
    expect(cookieJar.size).toBe(0);
    // After the pause (here: the count cleared) the right password works again.
    await query("delete from auth_attempts");
    expect((await signInAction({}, form({ email: "victim@test.local", password: "the real password" }))).go).toBeTruthy();
  });

  it("a correct sign-in clears the count of earlier slips", async () => {
    await createAccount({ name: "Slips", email: "slips@test.local", password: "the real password" });
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 5; i++) await signInAction({}, form({ email: "slips@test.local", password: "oops" }));
      expect((await signInAction({}, form({ email: "slips@test.local", password: "the real password" }))).go).toBeTruthy();
      await query("delete from auth_attempts where key like 'wrong-from:%'");
    }
  });

  it("rejects wrong, empty and oversized passwords, and odd emails, without errors", async () => {
    await createAccount({ name: "Target", email: "target@test.local", password: "the real password" });
    for (const password of ["", " ", "THE REAL PASSWORD", "the real password ", "p".repeat(1_000_000), "' or '1'='1"]) {
      const r = await signInAction({}, form({ email: "target@test.local", password }));
      expect(r.go, JSON.stringify(password).slice(0, 30)).toBeUndefined();
      await query("delete from auth_attempts");
    }
    expect((await signInAction({}, form({ email: "' or 1=1 --@test.local", password: "x" }))).go).toBeUndefined();
    expect((await signInAction({}, form({ email: "TARGET@test.local", password: "the real password" }))).go).toBeTruthy();
  });
});
