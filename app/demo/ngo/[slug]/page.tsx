import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircleHeart, Star, Users } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { CauseCover } from "@/components/art";
import { Avatar, TrustTick } from "@/components/kit";
import { demoActivities, demoNgo, demoNow, demoReviews, toCard } from "@/lib/demo";

export const metadata: Metadata = { title: "NGO" };
export const dynamic = "force-dynamic";

// NGO page (brief C2): cover, trust tick, short about, small stats, two reviews, what's coming up.
export default async function DemoNgoPage(props: PageProps<"/demo/ngo/[slug]">) {
  const { slug } = await props.params;
  const ngo = demoNgo(slug);
  if (!ngo) notFound();
  const upcoming = demoActivities(demoNow()).filter((a) => a.ngo === slug);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-2">
      <div className="overflow-hidden rounded-xl bg-card">
        <CauseCover cause={ngo.cause} className="h-40" />
        <div className="p-5">
          <div className="flex items-center gap-3">
            <Avatar name={ngo.name} className="size-12 text-base" />
            <div>
              <h1 className="flex items-center gap-2 text-2xl leading-7">{ngo.name}{ngo.checked && <TrustTick />}</h1>
              <p className="text-sm text-ink-soft">
                {ngo.checked ? "Checked by Show-Up · Registered NGO" : "Not checked by us yet"} · {ngo.city}
              </p>
            </div>
          </div>
          <p className="mt-4 line-clamp-2">{ngo.about}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold"><Users className="size-4 shrink-0 text-primary" aria-hidden />{ngo.joined}</li>
            {ngo.reply && <li className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm font-semibold"><MessageCircleHeart className="size-4 shrink-0 text-primary" aria-hidden />{ngo.reply}</li>}
            {ngo.rating !== null ? (
              <li className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold"><Star className="size-4 shrink-0 fill-accent text-accent" aria-hidden />{ngo.rating} ★ from {ngo.ratings} volunteers</li>
            ) : (
              <li className="rounded-xl bg-muted px-3 py-2 text-sm text-ink-soft">No reviews yet</li>
            )}
          </ul>
        </div>
      </div>

      {ngo.reviews.length > 0 && (
        <section className="mt-6">
          <h2 className="text-2xl">What volunteers say</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {ngo.reviews.slice(0, 2).map((id) => {
              const r = demoReviews[id];
              return (
                <li key={id} className="rounded-xl bg-card p-4">
                  <p>&ldquo;{r.text}&rdquo;</p>
                  <p className="mt-2 text-sm text-ink-soft">{r.by} · {r.cause}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-2xl">Coming up</h2>
        <ul className="mt-3 space-y-3">
          {upcoming.map((a) => <li key={a.slug}><ActivityCard a={toCard(a)} href={`/demo/a/${a.slug}`} /></li>)}
        </ul>
      </section>
    </main>
  );
}
