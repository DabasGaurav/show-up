import { FeedCard } from "@/components/feed-card";
import { NudgeCard } from "@/components/nudge-card";
import type { User } from "@/lib/auth";
import { currentLevel } from "@/lib/data/bookings";
import { isLocked } from "@/lib/data/feed";
import { nudgeFor } from "@/lib/data/nudges";
import { track } from "@/lib/events";
import { isEnabled } from "@/lib/flags";

/** Shows the re-engagement nudge at the top of the home screen when one is due (F12). */
export async function Nudge({ user, now }: { user: User; now: Date }) {
  if (!isEnabled("F12")) return null;
  const nudge = await nudgeFor(user, now);
  if (!nudge) return null;
  await track("nudge_shown", { reason: nudge.reason, tasks: nudge.tasks.map((t) => t.task_id) }, user.id);
  const level = await currentLevel(user, now);
  return (
    <NudgeCard text={nudge.text} seeAllHref={nudge.seeAllHref}>
      {nudge.tasks.map((t) => (
        <FeedCard key={t.task_id} t={t} locked={isLocked(level, t)} src="nudge" />
      ))}
    </NudgeCard>
  );
}
