import { isLabUnlocked } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { requireFeature } from "@/lib/flags";
import { listSessions, scenario } from "@/lib/lab";

export const dynamic = "force-dynamic";

// CSV of every lab session: scenario, tester, persona, captured metrics, outcome,
// answers, quote. Feeds the Validation status and Evidence columns in the assignment.
export async function GET() {
  requireFeature("LAB");
  if (!(await isLabUnlocked())) return new Response("Not authorised", { status: 401 });
  const sessions = await listSessions();
  const metricKeys = [...new Set(sessions.flatMap((s) => Object.keys(s.outcome.captured ?? {})))];
  const rows = sessions.map((s) => {
    const sc = scenario(s.scenario);
    return [
      s.scenario, s.tester_id, s.persona, s.started_at, s.ended_at,
      s.ended_at ? Math.round((s.ended_at.getTime() - s.started_at.getTime()) / 1000) : null,
      s.outcome.result ?? "", s.outcome.suggested ?? "",
      sc?.followUp?.question ?? "", sc?.followUp ? (s.outcome.answers?.[sc.followUp.key] ?? "") : "",
      s.quote, s.facilitator_notes,
      ...metricKeys.map((k) => s.outcome.captured?.[k]),
    ];
  });
  const csv = toCsv(
    ["scenario", "tester_id", "persona", "started_at", "ended_at", "duration_seconds", "outcome", "suggested_outcome",
     "follow_up_question", "follow_up_answer", "quote", "facilitator_notes", ...metricKeys.map((k) => `captured_${k}`)],
    rows,
  );
  return csvResponse("showup-lab-sessions.csv", csv);
}
