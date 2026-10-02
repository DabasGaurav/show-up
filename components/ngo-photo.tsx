import { CauseIcon } from "@/components/cause-icon";

// Sample NGO "photos" are generated illustrations, never real photos or logos (§11).
const PALETTE = [
  ["#1f3864", "#4a6fb5"],
  ["#17663a", "#5fae7f"],
  ["#8a5300", "#d9a441"],
];

/** `token` looks like "illus:Teaching:2". Anything else is treated as an image URL. */
export function NgoPhoto({ token, alt }: { token: string; alt: string }) {
  const m = /^illus:(.+):(\d)$/.exec(token);
  if (!m) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={token} alt={alt} className="aspect-4/3 w-full rounded-lg object-cover" />;
  }
  const [from, to] = PALETTE[(Number(m[2]) - 1) % PALETTE.length];
  return (
    <div
      role="img"
      aria-label={alt}
      className="flex aspect-4/3 w-full items-center justify-center rounded-lg text-white"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <CauseIcon cause={m[1]} className="size-8 opacity-90" />
    </div>
  );
}
