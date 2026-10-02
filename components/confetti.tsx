"use client";

const COLORS = ["#f2a541", "#0f5257", "#2e7d4f", "#b3432f", "#fdf0dc"];

/** A small burst, used only when a spot is saved (brief A5). Pure CSS, no library. */
export function Confetti() {
  return (
    <span className="pointer-events-none absolute top-8 left-1/2 block" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const dist = 70 + ((i * 37) % 60);
        return (
          <span
            key={i}
            className="absolute block h-2.5 w-1.5 animate-confetti rounded-sm"
            style={{
              background: COLORS[i % COLORS.length],
              ["--dx" as string]: `${Math.cos(angle) * dist}px`,
              ["--dy" as string]: `${Math.sin(angle) * dist + 40}px`,
              ["--rot" as string]: `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
              animationDelay: `${(i % 5) * 20}ms`,
            }}
          />
        );
      })}
    </span>
  );
}
