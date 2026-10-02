import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { finishSignIn } from "@/lib/signin";

export const dynamic = "force-dynamic";

// The link in the email. Opening it signs the person in and sends them on their way.
export async function GET(_req: Request, ctx: RouteContext<"/signin/[token]">) {
  const { token } = await ctx.params;
  const done = await finishSignIn(token);
  if (!done) redirect("/signin?expired=1");
  await signIn(done.userId);
  redirect(`${done.next}${done.next.includes("?") ? "&" : "?"}toast=in`);
}
