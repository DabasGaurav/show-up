import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(score) ? "fill-warn text-warn" : "text-muted-foreground/40")} aria-hidden />
      ))}
    </span>
  );
}
