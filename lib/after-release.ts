import "server-only";
import type { BookingView } from "@/lib/data/bookings";
import { isEnabled } from "@/lib/flags";

/**
 * What happens to a released seat. It always reopens on the task page (seat counts
 * are derived). In the prototype it is also offered to standby volunteers (F11);
 * in MVP1 it appears in the admin "Released slots" queue for the team to fill by hand.
 */
export async function afterRelease(b: BookingView, now: Date, origin: string): Promise<void> {
  if (!isEnabled("F11")) return;
  const { offerToStandby } = await import("@/lib/data/standby");
  await offerToStandby(b, now, origin);
}
