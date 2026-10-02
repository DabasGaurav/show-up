"use client";

import { useEffect, useState } from "react";
import { fmtCountdown } from "@/lib/format";

/** Live countdown. `serverNow` is the app's Now (may be simulated), so the offset is kept. */
export function Countdown({ deadline, serverNow }: { deadline: number; serverNow: number }) {
  const [left, setLeft] = useState(deadline - serverNow);
  useEffect(() => {
    const offset = serverNow - Date.now();
    const id = setInterval(() => setLeft(deadline - (Date.now() + offset)), 1000);
    return () => clearInterval(id);
  }, [deadline, serverNow]);
  return <span className="tabular-nums">{fmtCountdown(left)}</span>;
}
