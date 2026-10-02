"use client";

import { useRouter } from "next/navigation";

/** "Pick a date": the one filter that needs a control instead of a link. `hrefFor` has DATE where the date goes. */
export function DatePick({ value, min, hrefFor, className }: { value: string; min: string; hrefFor: string; className?: string }) {
  const router = useRouter();
  return (
    <label className={className}>
      Pick a date
      <input type="date" min={min} value={value} onChange={(e) => router.push(hrefFor.replace("DATE", e.target.value), { scroll: false })} className="bg-transparent text-sm" aria-label="Pick a date" />
    </label>
  );
}
