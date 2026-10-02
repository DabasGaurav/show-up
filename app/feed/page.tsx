import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { FeedCard } from "@/components/feed-card";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { currentLevel } from "@/lib/data/bookings";
import { activeFilterCount, applyFilters, isLocked, listFeed, parseFilters } from "@/lib/data/feed";
import { track } from "@/lib/events";
import { requireFeature } from "@/lib/flags";
import { istDateKey } from "@/lib/format";
import { meetsMinTrust } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { FilterBar } from "./filter-bar";

export const metadata: Metadata = { title: "Tasks" };

// Screen 2: one feed with filters (F9). Prototype only.
export default async function FeedPage(props: PageProps<"/feed">) {
  requireFeature("F9");
  const [sp, user, at] = await Promise.all([props.searchParams, getUser(), now()]);
  const filters = parseFilters(sp, user?.city ?? "Delhi NCR");
  const level = user ? await currentLevel(user, at) : "new";
  const items = applyFilters(await listFeed(at), filters, at);
  const active = activeFilterCount(filters);
  await track("page_view", { page: "feed", results: items.length, filters: active }, user?.id ?? null);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        <h1 className="sr-only">Tasks</h1>
        {filters.ids.length > 0 ? (
          <p className="rounded-lg bg-info-soft px-4 py-3 text-sm">Three tasks picked for you. Choose one and book it.</p>
        ) : (
          <FilterBar
            filters={filters}
            activeCount={active}
            lockedLevels={(["verified", "trusted"] as const).filter((l) => !meetsMinTrust(level, l))}
            today={istDateKey(at)}
          />
        )}

        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {items.length} {items.length === 1 ? "task" : "tasks"}
          {filters.ids.length === 0 && ` in ${filters.city === "Online" ? "Online" : `${filters.city} and online`}`}
        </p>

        {items.length === 0 ? (
          <div className="mt-4 rounded-xl border bg-card p-6 text-center">
            <p className="font-medium">No tasks match. Try widening distance or dates.</p>
            <Link href={`/feed?city=${encodeURIComponent(filters.city)}`} className={cn(buttonVariants({ size: "tap" }), "mt-4")}>
              Clear filters
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((t) => (
              <li key={t.task_id}>
                <FeedCard t={t} locked={isLocked(level, t)} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
