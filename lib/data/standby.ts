import "server-only";
import type { BookingView } from "@/lib/data/bookings";

// Standby cover (F11) — implemented in Milestone 7.
export async function offerToStandby(_released: BookingView, _now: Date, _origin: string): Promise<number> {
  return 0;
}
