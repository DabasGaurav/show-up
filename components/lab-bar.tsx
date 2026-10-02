import { endTaskAction } from "@/app/lab/actions";
import { isEnabled } from "@/lib/flags";
import { activeSession } from "@/lib/lab";

/** Small floating "End task" button, visible to the facilitator while a lab session runs. */
export async function LabBar() {
  if (!isEnabled("LAB")) return null;
  const session = await activeSession();
  if (!session) return null;
  return (
    <form action={endTaskAction} className="fixed bottom-3 left-16 z-50">
      <button
        type="submit"
        className="flex min-h-11 items-center gap-2 rounded-full border border-white/40 bg-black/80 px-4 text-xs font-semibold text-white shadow-lg"
      >
        <span className="size-2 rounded-full bg-red-500" aria-hidden />
        End task
        <span className="font-normal opacity-70">{session.scenario} · {session.tester_id}</span>
      </button>
    </form>
  );
}
