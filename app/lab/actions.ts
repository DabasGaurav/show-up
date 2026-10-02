"use server";

import { redirect } from "next/navigation";
import { isLabUnlocked, lock, unlock } from "@/lib/auth";
import { track } from "@/lib/events";
import { requireFeature } from "@/lib/flags";
import {
  activeSession, beginSession, createSession, endSession, getSession, saveFacilitatorForm, scenario, setSuggested,
  sh7Suggestion,
  type ScenarioId,
} from "@/lib/lab";
import { siteUrl } from "@/lib/site";

async function assertLab() {
  requireFeature("LAB");
  if (!(await isLabUnlocked())) throw new Error("Not authorised");
}

export async function unlockLabAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  requireFeature("LAB");
  if (!(await unlock("lab", String(form.get("passcode") ?? "")))) return { error: "Wrong passcode." };
  redirect("/lab");
}

export async function lockLabAction() {
  await lock("lab");
  redirect("/");
}

/** Start screen → resets the sample data to the scenario's state. */
export async function startScenarioAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  await assertLab();
  const s = scenario(String(form.get("scenario")));
  const tester = String(form.get("tester_id") ?? "").trim();
  if (!s) return { error: "Choose a scenario." };
  if (!/^[\w-]{2,20}$/.test(tester)) return { error: "Enter a tester ID such as T-V1 or T-N2." };
  const session = await createSession(s.id as ScenarioId, tester, String(form.get("persona") || s.persona), await siteUrl());
  redirect(`/lab/run/${session.id}`);
}

/** Opens the app in tester view and starts the timer. */
export async function openTesterViewAction(form: FormData) {
  await assertLab();
  const session = await getSession(String(form.get("id")));
  if (!session || session.ended_at) redirect("/lab");
  redirect(await beginSession(session));
}

/** The floating "End task" button. */
export async function endTaskAction() {
  requireFeature("LAB");
  const session = await activeSession();
  if (!session) redirect("/lab");
  await endSession(session);
  redirect(`/lab/sessions/${session.id}`);
}

export async function saveFormAction(form: FormData) {
  await assertLab();
  const id = String(form.get("id"));
  const session = await getSession(id);
  if (!session) redirect("/lab");
  const s = scenario(session.scenario)!;
  const answers: Record<string, string> = {};
  if (s.followUp) answers[s.followUp.key] = String(form.get("follow_up") ?? "").trim();
  const r = String(form.get("result"));
  let result: "Pass" | "Fail" | "Partial" = r === "Pass" || r === "Fail" ? r : "Partial";
  // SH7's pass rule compares the number planned in the app with today's practice, which
  // is only known now. If the facilitator left the pre-filled outcome, use the computed one.
  if (session.scenario === "SH7" && s.followUp) {
    const aims = Number(answers[s.followUp.key]);
    const planned = session.outcome.captured?.planned_signups;
    const suggested = sh7Suggestion(
      typeof planned === "number" ? planned : null,
      answers[s.followUp.key] && Number.isFinite(aims) ? aims : null,
    );
    if (result === (session.outcome.suggested ?? "Partial")) result = suggested;
    await setSuggested(id, suggested);
  }
  await saveFacilitatorForm(id, {
    result,
    answers,
    quote: String(form.get("quote") ?? "").trim(),
    notes: String(form.get("notes") ?? "").trim(),
  });
  redirect("/lab?saved=1");
}

/** SH7 planning widget: "How many sign-ups will you aim for?" */
export async function planningAnswerAction(_prev: { saved?: number }, form: FormData): Promise<{ saved?: number }> {
  requireFeature("LAB");
  const n = Number(form.get("planned_signups"));
  if (!Number.isInteger(n) || n < 1 || n > 200) return {};
  await track("lab_planning_answer", { planned_signups: n, needed: Number(form.get("needed")) || null });
  return { saved: n };
}
