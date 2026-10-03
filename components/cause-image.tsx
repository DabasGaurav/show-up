import Image from "next/image";
import { CausePeep } from "@/components/art";
import { causeColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Photo for each cause (public/causes). A cause without one falls back to its illustration. */
const PHOTO: Record<string, string> = {
  Teaching: "teaching", Food: "food", "Trees & green": "trees-green", Animals: "animals", Health: "health", Elders: "elders",
};

/** The picture that stands for a cause: on activity cards, cause tiles and activity pages. Decorative, so no alt text. */
export function CauseImage({ cause, className, sizes = "160px", priority, vary }: { cause: string; className?: string; sizes?: string; priority?: boolean; /** Any text, e.g. the activity's title: shifts which part of the photo shows, so a list doesn't repeat one picture. */ vary?: string }) {
  const file = PHOTO[cause];
  const at = vary ? ["12% 50%", "50% 50%", "88% 50%"][[...vary].reduce((a, c) => a + c.charCodeAt(0), 0) % 3] : undefined;
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: causeColor(cause) }} aria-hidden>
      {file
        ? <Image src={`/causes/${file}.jpg`} alt="" fill sizes={sizes} priority={priority} className="object-cover" style={at ? { objectPosition: at } : undefined} />
        : <CausePeep cause={cause} className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto max-w-full" />}
    </div>
  );
}
